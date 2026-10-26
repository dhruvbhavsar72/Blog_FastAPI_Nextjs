from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlencode
import httpx
from decouple import config
from fastapi import HTTPException, status

OAuthProvider = Literal["google", "github"]

GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "blog-fastapi",
}

TIMEOUT = httpx.Timeout(10.0)


@dataclass(frozen=True, slots=True)
class ProviderConfig:
    client_id: str
    client_secret: str
    redirect_uri: str
    authorize_url: str
    token_url: str
    scope: str


@dataclass(slots=True)
class OAuthProfile:
    """Provider-independent identity, ready to be persisted."""

    provider: str
    provider_user_id: str
    email: str
    email_verified: bool
    first_name: str
    last_name: str | None = None
    picture: str | None = None
    bio: str | None = None


def _providers() -> dict[str, ProviderConfig]:
    return {
        "google": ProviderConfig(
            client_id=config("GOOGLE_CLIENT_ID", default=""),
            client_secret=config("GOOGLE_CLIENT_SECRET", default=""),
            redirect_uri=config("GOOGLE_REDIRECT_URI", default=""),
            authorize_url=GOOGLE_AUTHORIZE_URL,
            token_url=GOOGLE_TOKEN_URL,
            scope="openid email profile",
        ),
        "github": ProviderConfig(
            client_id=config("GITHUB_CLIENT_ID", default=""),
            client_secret=config("GITHUB_CLIENT_SECRET", default=""),
            redirect_uri=config("GITHUB_REDIRECT_URI", default=""),
            authorize_url=GITHUB_AUTHORIZE_URL,
            token_url=GITHUB_TOKEN_URL,
            scope="read:user user:email",
        ),
    }


def provider_config(provider: str) -> ProviderConfig:
    cfg = _providers().get(provider)
    if cfg is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}",
        )
    if not cfg.client_id or not cfg.client_secret or not cfg.redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth for {provider} is not configured",
        )
    return cfg


def authorization_url(provider: OAuthProvider, state: str) -> str:
    cfg = provider_config(provider)
    params = {
        "client_id": cfg.client_id,
        "redirect_uri": cfg.redirect_uri,
        "scope": cfg.scope,
        "state": state,
        "response_type": "code",
    }
    return f"{cfg.authorize_url}?{urlencode(params)}"


def _split_name(full_name: str | None, fallback: str) -> tuple[str, str | None]:
    if full_name and full_name.strip():
        parts = full_name.strip().split(None, 1)
        return parts[0], (parts[1] if len(parts) > 1 else None)
    return fallback, None


async def _exchange_code(
    client: httpx.AsyncClient, provider: str, cfg: ProviderConfig, code: str
) -> str:
    headers = {"Accept": "application/json"}
    if provider == "github":
        headers.update(GITHUB_HEADERS)

    response = await client.post(
        cfg.token_url,
        data={
            "client_id": cfg.client_id,
            "client_secret": cfg.client_secret,
            "code": code,
            "redirect_uri": cfg.redirect_uri,
            "grant_type": "authorization_code",
        },
        headers=headers,
    )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not exchange {provider} authorization code",
        )

    access_token = response.json().get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Provider {provider} did not return an access token",
        )
    return access_token


async def _google_profile(client: httpx.AsyncClient, token: str) -> OAuthProfile:
    response = await client.get(
        GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not read your Google profile",
        )

    data = response.json()
    email = (data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your Google account does not expose an email address",
        )

    given = (data.get("given_name") or "").strip()
    family = (data.get("family_name") or "").strip()
    if given:
        first_name = given
        last_name = family or None
    else:
        first_name, last_name = _split_name(data.get("name"), email.split("@")[0])
        last_name = last_name or family or None
    return OAuthProfile(
        provider="google",
        provider_user_id=str(data["sub"]),
        email=email,
        email_verified=bool(data.get("email_verified")),
        first_name=first_name,
        last_name=last_name,
        picture=data.get("picture"),
    )


async def _github_profile(client: httpx.AsyncClient, token: str) -> OAuthProfile:
    headers = {"Authorization": f"Bearer {token}", **GITHUB_HEADERS}

    response = await client.get(GITHUB_USER_URL, headers=headers)
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not read your GitHub profile",
        )
    data = response.json()

    emails = await client.get(GITHUB_EMAILS_URL, headers=headers)
    if emails.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read your GitHub emails. The user:email scope is required.",
        )
    entries = emails.json()
    chosen = next(
        (e for e in entries if e.get("primary") and e.get("verified")), None
    ) or next((e for e in entries if e.get("verified")), None)
    if chosen is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your GitHub account has no verified email address",
        )

    first_name, last_name = _split_name(data.get("name"), data.get("login") or "user")
    return OAuthProfile(
        provider="github",
        provider_user_id=str(data["id"]),
        email=chosen["email"].strip().lower(),
        email_verified=True,
        first_name=first_name,
        last_name=last_name,
        picture=data.get("avatar_url"),
        bio=data.get("bio"),
    )


async def get_profile(provider: OAuthProvider, code: str) -> OAuthProfile:
    cfg = provider_config(provider)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        token = await _exchange_code(client, provider, cfg, code)
        if provider == "google":
            return await _google_profile(client, token)
        return await _github_profile(client, token)
