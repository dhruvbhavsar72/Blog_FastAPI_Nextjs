import secrets
from urllib.parse import quote
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from decouple import config
from pydantic import ValidationError
from users.oauth import OAuthProvider, authorization_url, get_profile
from users.services import (
    create_user,
    forgot_password,
    get_or_create_oauth_user,
    send_reset_email,
    update_password,
    update_profile,
    user_login,
)
from users.schemas import (
    Email,
    ForgotPassword,
    Name,
    OTPGenerate,
    OTPResponse,
    OTPVerify,
    PasswordUpdate,
    StrongPassword,
    UserBase,
    UserCreate,
    UserLogin,
    UserRead,
    UserRegistered,
    UserUpdate,
)
from utils import create_tokens, get_current_user, revoke_token, verify_email_token, verify_token
from db.config import SessionDep
from db.models import User
from users.otp import generate_otp, verify_otp

router = APIRouter()

STATE_COOKIE = "oauth_state"
STATE_MAX_AGE = 600
ACCESS_TOKEN_MAX_AGE = 60 * 15
REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7

FRONTEND_URL = config("FRONTEND_URL", default="/")
COOKIE_SECURE = config("COOKIE_SECURE", default=False, cast=bool)


@router.get("/auth/{provider}/login")
async def oauth_login(provider: OAuthProvider):
    state = secrets.token_urlsafe(32)
    response = RedirectResponse(authorization_url(provider, state))
    response.set_cookie(
        STATE_COOKIE,
        state,
        max_age=STATE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    return response


@router.get("/auth/{provider}/callback")
async def oauth_callback(
    provider: OAuthProvider,
    request: Request,
    session: SessionDep,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/login?error={quote(error)}")

    expected = request.cookies.get(STATE_COOKIE)
    if not expected or not state or not secrets.compare_digest(expected, state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or missing OAuth state",
        )
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing authorization code",
        )

    profile = await get_profile(provider, code)
    user = await get_or_create_oauth_user(session, profile)
    tokens = await create_tokens(session, user)

    response = RedirectResponse(FRONTEND_URL)
    response.delete_cookie(STATE_COOKIE)
    response.set_cookie(
        "access_token",
        tokens["access_token"],
        max_age=ACCESS_TOKEN_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    response.set_cookie(
        "refresh_token",
        tokens["refresh_token"],
        max_age=REFRESH_TOKEN_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    return response


@router.post("/register", response_model=UserRegistered)
async def new_user(
    session: SessionDep,
    first_name: Name = Form(...),
    last_name: Name = Form(...),
    email: Email = Form(...),
    password: StrongPassword = Form(...),
    phone: str | None = Form(None),
    bio: str | None = Form(None),
    image: UploadFile | None = File(None),
):
    try:
        user = UserCreate(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=password,
            phone=phone,
            bio=bio,
        )
    except ValidationError as e:
        raise RequestValidationError(e.errors())

    try:
        new_user = await create_user(session, user, image)
        return {"msg": "User Registered", "user": new_user}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/login")
async def login(session: SessionDep, user: UserLogin):
    user = await user_login(session, user)
    tokens = await create_tokens(session, user)
    response = JSONResponse(content={"msg": "Login Sucess"})
    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 1,
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 7,
    )
    return response


@router.get("/refresh")
async def refresh(session: SessionDep, request: Request):
    rft = request.cookies.get("refresh_token")

    if not rft:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token Missing",
        )

    user = await verify_token(session, rft)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired Refresh Token",
        )

    tokens = await create_tokens(session, user)

    response = JSONResponse(content={"MSG": "Token refreshed"})

    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 1,
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 7,
    )
    return response


@router.put("/update_password")
async def change_password(
    session: SessionDep, pwd: PasswordUpdate, user=Depends(get_current_user)
):
    return await update_password(session, user, pwd.new_password)


@router.post("/send-password-reset-email")
async def send_password_reset_email(
    session: SessionDep, data: ForgotPassword, bg_tasks: BackgroundTasks
):
    return await send_reset_email(session, data, bg_tasks)


@router.post("/reset-password")
async def reset_password(session: SessionDep, data: PasswordUpdate, token: str):
    return await forgot_password(session, token, data.new_password)


@router.post("/otp_generate", response_model=OTPResponse)
async def request_otp(
    session: SessionDep, data: OTPGenerate, bg_tasks: BackgroundTasks
):
    return await generate_otp(session, data, bg_tasks)


@router.post("/otp_verify")
async def confirm_otp(session: SessionDep, data: OTPVerify):
    result = await verify_otp(session, data)
    tokens = result["tokens"]

    response = JSONResponse(content={"msg": "Login Success"})
    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 1,
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 7,
    )
    return response


@router.put("/update_profile")
async def update_user_profile(
    session: SessionDep,
    phone: str | None = Form(None),
    bio: str | None = Form(None),
    image: UploadFile | None = File(None),
    user=Depends(get_current_user),
):
    fields = {
        "phone": phone,
        "bio": bio,
    }

    updates = {}
    for key, value in fields.items():
        if value is None:
            continue
        if not value.strip():
            if key in {"phone", "bio"}:
                updates[key] = None
            continue
        updates[key] = value

    try:
        data = UserUpdate(**updates)
    except ValidationError as e:
        raise RequestValidationError(e.errors())

    return await update_profile(session, user, data, image)

@router.post("/verify_email")
async def verify_email(session: SessionDep, token: str):
    user = verify_email_token(token, "email_verification")
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired email verification token",
        )

    user.is_verified = True
    session.add(user)
    await session.commit()
    return {"msg": "User Verified Successfully"}


@router.post("/logout")
async def logout(session: SessionDep, request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        await revoke_token(session, refresh_token)
    response = JSONResponse(content={"MSG": "Logout Success"})
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")

    return response


@router.get("/me", response_model=UserRead | None)
async def read_me(request: Request, session: SessionDep):
    try:
        return await get_current_user(session, request)
    except HTTPException as error:
        if error.status_code != status.HTTP_401_UNAUTHORIZED:
            raise

    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        return None

    user = await verify_token(session, refresh_token)
    if user is None:
        response = JSONResponse(content=None)
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response

    tokens = await create_tokens(session, user)
    response = JSONResponse(
        content=UserRead.model_validate(user).model_dump(mode="json")
    )
    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24,
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 7,
    )
    return response
