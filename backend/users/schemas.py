import re
from datetime import datetime
from typing import Annotated, Literal
from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    EmailStr,
    Field,
    StringConstraints,
    model_validator,
)


def password_checker(value: str) -> str:
    if len(value) < 8 or len(value) > 16:
        raise ValueError(f"Password must be between 8 to 16 characters long")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one number")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("Password must contain at least one special character")
    return value


def email_checker(value: str) -> str:
    email = value.strip()
    if not re.fullmatch(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$", email):
        raise ValueError("Invalid email format")
    return email.lower()


def phone_checker(value: str) -> str:
    phone = re.sub(r"[\s\-().]", "", value.strip())
    if not re.fullmatch(r"\+?\d{8,15}", phone):
        raise ValueError("Invalid phone number")
    return phone


def optional_phone_checker(value: str | None) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Invalid phone number")
    value = value.strip()
    if not value:
        return None
    return phone_checker(value)


Email = Annotated[EmailStr, AfterValidator(email_checker)]
Phone = Annotated[str | None, BeforeValidator(optional_phone_checker)]
StrongPassword = Annotated[str, AfterValidator(password_checker)]
Name = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=100,
    ),
]




class UserBase(BaseModel):
    first_name: Name
    last_name: Name
    email: Email
    phone: Phone = None
    profile_image: str | None = Field(default=None)
    bio: str | None = Field(default=None, max_length=500)

    model_config = {"from_attributes": True}


class UserCreate(UserBase):
    password: StrongPassword


class UserUpdate(BaseModel):
    email: Email | None = None
    phone: Phone = None
    bio: str | None = Field(default=None, max_length=500)


class UserRead(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    email: Email
    phone: str | None = None
    profile_image: str | None = None
    bio: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRegistered(BaseModel):
    msg: str
    user: UserRead


class UserLogin(BaseModel):
    email: Email
    password: str = Field(min_length=1, max_length=128)


class PasswordUpdate(BaseModel):
    new_password: StrongPassword


class ForgotPassword(BaseModel):
    email: Email


class AuthBase(BaseModel):
    provider: Literal["google", "github"]
    provider_user_id: str
    password_hash: str | None = None


# ============================================================
# OTP
# ============================================================


def normalize_otp_destination(destination: str, destination_type: str) -> str:
    destination = destination.strip()
    if not destination:
        raise ValueError("Destination cannot be empty")
    if destination_type == "email":
        return email_checker(destination)
    return phone_checker(destination)


class OTPGenerate(BaseModel):
    destination: str = Field(..., min_length=1, max_length=255)
    destination_type: Literal["email", "phone"] = Field(
        ..., description="Choose whether to send the OTP by email or phone."
    )

    @model_validator(mode="after")
    def normalize_destination(self):
        self.destination = normalize_otp_destination(
            self.destination, self.destination_type
        )
        return self


class OTPVerify(BaseModel):
    destination: str = Field(..., min_length=1, max_length=255)
    destination_type: Literal["email", "phone"] = Field(
        ..., description="Choose whether the OTP was sent by email or phone."
    )
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

    @model_validator(mode="after")
    def normalize_destination(self):
        self.destination = normalize_otp_destination(
            self.destination, self.destination_type
        )
        return self


class OTPResponse(BaseModel):
    destination: str
    destination_type: Literal["email", "phone"]
    expires_at: datetime

    model_config = {"from_attributes": True}
    
