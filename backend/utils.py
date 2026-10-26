from email.message import EmailMessage
import hashlib
import uuid
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
from fastapi import BackgroundTasks, HTTPException, Request, UploadFile, status
from jose import jwt, ExpiredSignatureError, JWTError
from decouple import config
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.config import SessionDep
from db.models import User, RefreshToken
import aiosmtplib

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

UPLOAD_DIR = Path("media")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024

SECRET_KEY = config("SECRET_KEY")


EMAIL_HOST = config("EMAIL_HOST")
EMAIL_HOST_USER = config("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD")
EMAIL_PORT = config("EMAIL_PORT")
EMAIL_SENDER = config("EMAIL_SENDER")


def hash_password(password: str):
    return pwd.hash(password)


def verify_password(old_password: str, new_password: str):
    return pwd.verify(old_password, new_password)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def save_upload_file(
    upload_file: UploadFile,
    sub_dir: str,
    allowed_extensions: set[str] = ALLOWED_IMAGE_EXTENSIONS,
    max_bytes: int = MAX_IMAGE_BYTES,
):
    ext = Path(upload_file.filename or "").suffix.lower()
    if ext not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {allowed}",
        )

    content = await upload_file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File too large (max {max_bytes // (1024 * 1024)} MB)",
        )

    filename = f"{uuid4().hex}{ext}"
    dir_path = UPLOAD_DIR / sub_dir
    dir_path.mkdir(parents=True, exist_ok=True)
    file_path = dir_path / filename
    file_path.write_bytes(content)

    return file_path.as_posix()


def create_access_token(data: dict, expires_data: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_data or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encode_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encode_jwt


def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms="HS256")
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="You are Unauthorized"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


async def create_tokens(session: AsyncSession, user: User):
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_tkn_str = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(days=7)

    refresh_token = RefreshToken(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_tkn_str),
        expires_at=expire,
    )
    session.add(refresh_token)
    await session.commit()
    return {"access_token": access_token, "refresh_token": refresh_tkn_str}


async def verify_token(session: AsyncSession, token: str):
    stmt = select(RefreshToken).where(
        RefreshToken.refresh_token_hash == hash_token(token)
    )
    res = await session.execute(stmt)
    tkn = res.scalar_one_or_none()

    if tkn and not tkn.revoked:
        exp = tkn.expires_at
        if exp.tzinfo is None:
            expire = exp.replace(timezone.utc)
        else:
            expire = exp

        if expire > datetime.now(timezone.utc):
            user_exp = select(User).where(User.id == tkn.user_id)
            user_result = await session.execute(user_exp)
            return user_result.scalar_one_or_none()

    return None


async def revoke_token(session: AsyncSession, token: str):
    stmt = select(RefreshToken).where(
        RefreshToken.refresh_token_hash == hash_token(token)
    )
    result = await session.execute(stmt)
    refresh_token = result.scalar_one_or_none()

    if refresh_token is not None:
        refresh_token.revoked = True
        session.add(refresh_token)
        await session.commit()


async def get_current_user(session: SessionDep, request: Request):
    tkn = request.cookies.get("access_token")
    if not tkn:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You are Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(tkn)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You are Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You are Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You are Unauthorized",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def create_reset_password_token(user_id: int):
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    to_encode = {"sub": str(user_id), "type": "reset_password", "exp": expire}
    encode_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encode_jwt


def create_email_verification_token(user_id: int):
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode = {"sub": str(user_id), "type": "email_verification", "exp": expire}
    encode_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encode_jwt


def verify_email_token(token: str, token_type: str):
    try:
        payload = decode_token(token)
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


async def send_mail(
    subject: str, recipient: list[str], body: str, sender: str = EMAIL_SENDER
):
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = ", ".join(recipient)
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        await aiosmtplib.send(
            msg,
            hostname=EMAIL_HOST,
            username=EMAIL_HOST_USER,
            password=EMAIL_HOST_PASSWORD,
            port=EMAIL_PORT,
        )
    except Exception as e:
        print(f"failed to email send {recipient}: {e}")
