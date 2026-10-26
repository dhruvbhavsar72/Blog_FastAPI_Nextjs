from users.oauth import OAuthProfile
from users.schemas import ForgotPassword, UserCreate, UserLogin, UserUpdate
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks, HTTPException, UploadFile, status
from utils import (
    create_email_verification_token,
    create_reset_password_token,
    hash_password,
    save_upload_file,
    send_mail,
    verify_email_token,
    verify_password,
)
from db.models import AuthAccount, User
from decouple import config

FRONTEND_URL = config("FRONTEND_URL")


async def create_user(
    session: AsyncSession, user: UserCreate, img_str: UploadFile | None = None
):
    user_present = select(User.id).where(User.email == user.email)
    existing = await session.execute(user_present)
    res = existing.scalar_one_or_none()

    if res is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    img_path = await save_upload_file(img_str, "images") if img_str else None

    new_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone,
        profile_image=img_path,
        bio=user.bio,
    )
    new_user.auth_accounts.append(
        AuthAccount(
            provider="password",
            password_hash=hash_password(user.password),
        )
    )

    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user


async def user_login(session: AsyncSession, user: UserLogin):
    stmt = select(User).where(User.email == user.email)
    result = await session.execute(stmt)
    loginuser = result.scalar_one_or_none()

    if not loginuser:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User Not Found"
        )

    account = (
        await session.execute(
            select(AuthAccount).where(
                AuthAccount.user_id == loginuser.id,
                AuthAccount.provider == "password",
            )
        )
    ).scalar_one_or_none()

    if (
        account is None
        or account.password_hash is None
        or not verify_password(user.password, account.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Password"
        )

    return loginuser


def _credential_lookup(provider: str, provider_user_id: str):
    return (
        select(User)
        .join(AuthAccount)
        .where(
            AuthAccount.provider == provider,
            AuthAccount.provider_user_id == provider_user_id,
        )
    )


async def get_or_create_oauth_user(
    session: AsyncSession, profile: OAuthProfile
) -> User:
    lookup = _credential_lookup(profile.provider, profile.provider_user_id)

    user = (await session.execute(lookup)).scalar_one_or_none()
    if user is not None:
        return user

    existing_email = (
        await session.execute(select(User).where(User.email == profile.email))
    ).scalar_one_or_none()

    if existing_email is not None:
        if not profile.email_verified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "An account with this email already exists. Sign in with your "
                    "password first, then link this provider."
                ),
            )
        existing_email.auth_accounts.append(
            AuthAccount(
                provider=profile.provider,
                provider_user_id=profile.provider_user_id,
            )
        )
        user = existing_email
    else:
        user = User(
            first_name=profile.first_name,
            last_name=profile.last_name,
            email=profile.email,
            phone=None,
            profile_image=profile.picture,
            bio=profile.bio,
            is_verified=profile.email_verified,
        )
        user.auth_accounts.append(
            AuthAccount(
                provider=profile.provider,
                provider_user_id=profile.provider_user_id,
            )
        )
        session.add(user)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        user = (await session.execute(lookup)).scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This account is already linked to another user",
            )

    await session.refresh(user)
    return user


async def update_password(session: AsyncSession, user: User, new_password: str):
    if verify_password(new_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="new password can not same as old password",
        )

    user.password = hash_password(new_password)
    session.add(user)
    await session.commit()
    return {"message": "Password updated successfully."}


async def send_reset_email(
    session: AsyncSession, data: ForgotPassword, bg_tasks: BackgroundTasks
):
    user = select(User).where(User.email == data.email)
    res = await session.execute(user)
    resultUser = res.scalars().first()

    if resultUser is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="user not found"
        )

    token = create_reset_password_token(user_id=int(resultUser.id))
    link = f"{FRONTEND_URL}/forgot-password?token={token}"
    subject = "Forgot Password"
    body = f"Hi {resultUser.email},\n\nPlease update the password via this link:\n{link}\n\nThank you!"
    bg_tasks.add_task(send_mail, subject, [resultUser.email], body)


async def forgot_password(session: AsyncSession, token: str, new_password: str):
    user_id = verify_email_token(token, "reset_password")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token"
        )

    stmt = select(User).where(User.id == user_id)
    result = await session.scalars(stmt)
    user = result.first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User is not fount"
        )

    if verify_password(new_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="you can not keep same password",
        )

    user.password = hash_password(new_password)
    session.add(user)
    await session.commit()
    return {"message": "Password reset successfully."}


async def update_profile(
    session: AsyncSession,
    user: User,
    data: UserUpdate,
    img_str: UploadFile | None = None,
):
    updates = data.model_dump(exclude_unset=True)
    if "phone" in updates and updates["phone"] is not None:
        existing_phone = await session.scalar(
            select(User.id).where(User.phone == updates["phone"], User.id != user.id)
        )
        if existing_phone is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already registered",
            )

    img_path = await save_upload_file(img_str, "images") if img_str else None

    allowed_fields = {"phone", "bio"}
    for key, value in updates.items():
        if key in allowed_fields:
            setattr(user, key, value)

    if img_path is not None:
        user.profile_image = img_path

    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )
    await session.refresh(user)
    return user


async def send_verification_email(
    session: AsyncSession, user: User, bg_tasks: BackgroundTasks
):
    user = select(User).where(User.email == user.email)
    res = await session.execute(user)
    resultUser = res.scalars().first()
    if resultUser is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="user not found"
        )
    token = create_email_verification_token(user_id=int(user.id))
    link = f"{FRONTEND_URL}/verify-email?token={token}"
    subject = "Email Verification"
    body = f"Hi {user.email},\n\nPlease verify your email via this link:\n{link}\n\nThank you!"
    bg_tasks.add_task(send_mail, subject, [user.email], body)
