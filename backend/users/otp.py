from users.schemas import OTPGenerate, OTPVerify
from datetime import datetime, timedelta, timezone
import secrets
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks, HTTPException, status
from utils import (
    create_tokens,
    hash_password,
    send_mail,
    verify_password,
)
from db.models import OTPCode, User

OTP_LIFETIME = timedelta(minutes=5)
OTP_MAX_ATTEMPTS = 3
OTP_RESEND_COOLDOWN = timedelta(seconds=60)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


async def generate_otp(
    session: AsyncSession, data: OTPGenerate, bg_tasks: BackgroundTasks
) -> OTPCode:
    destination = data.destination
    now = datetime.now(timezone.utc)

    user_destination = User.email if data.destination_type == "email" else User.phone
    stmt = select(User).where(user_destination == destination)
    userstmt = await session.execute(stmt)
    user = userstmt.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User Not Found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )
    get_code = (
        select(OTPCode)
        .where(
            OTPCode.destination == destination,
            OTPCode.destination_type == data.destination_type,
        )
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    latest_code_stmt = await session.execute(get_code)
    latest_code = latest_code_stmt.scalar_one_or_none()

    if latest_code is not None:
        retry_after = OTP_RESEND_COOLDOWN - (now - _as_utc(latest_code.created_at))
        if retry_after > timedelta(0):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Please wait {int(retry_after.total_seconds()) + 1} "
                    "seconds before requesting another OTP"
                ),
            )

    await session.execute(
        delete(OTPCode)
        .where(
            OTPCode.destination == destination,
            OTPCode.destination_type == data.destination_type,
            OTPCode.created_at < now - timedelta(days=1),
        )
        .execution_options(synchronize_session=False)
    )

    existing_codes = await session.scalars(
        select(OTPCode).where(
            OTPCode.destination == destination,
            OTPCode.destination_type == data.destination_type,
            OTPCode.verified_at.is_(None),
        )
    )
    for existing_code in existing_codes:
        existing_code.expires_at = now

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    otp_record = OTPCode(
        user_id=user.id,
        destination=destination,
        destination_type=data.destination_type,
        otp_hash=hash_password(otp_code),
        expires_at=now + OTP_LIFETIME,
    )
    session.add(otp_record)
    await session.commit()
    await session.refresh(otp_record)

    if data.destination_type == "email":
        bg_tasks.add_task(
            send_mail,
            "Your verification code",
            [destination],
            f"Your verification code is {otp_code}. It expires in 5 minutes.",
        )
    else:
        print(f"OTP for {destination}: {otp_code}")

    return otp_record


async def verify_otp(session: AsyncSession, data: OTPVerify) -> dict:
    otp_record = await session.scalar(
        select(OTPCode)
        .where(
            OTPCode.destination == data.destination,
            OTPCode.destination_type == data.destination_type,
            OTPCode.verified_at.is_(None),
        )
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    if otp_record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    now = datetime.now(timezone.utc)
    if _as_utc(otp_record.expires_at) <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    if otp_record.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many invalid OTP attempts",
        )

    if not verify_password(data.otp_code, otp_record.otp_hash):
        new_attempts = await session.scalar(
            update(OTPCode)
            .where(OTPCode.id == otp_record.id)
            .values(attempts=OTPCode.attempts + 1)
            .returning(OTPCode.attempts)
        )
        if new_attempts is not None and new_attempts >= OTP_MAX_ATTEMPTS:
            await session.execute(
                update(OTPCode)
                .where(OTPCode.id == otp_record.id)
                .values(expires_at=now)
            )
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many invalid OTP attempts",
            )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP",
        )

    if otp_record.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    user = await session.get(User, otp_record.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    otp_record.verified_at = now
    await session.flush()
    tokens = await create_tokens(session, user)
    return {"user": user, "tokens": tokens}
