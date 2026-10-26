from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field, model_validator


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class CategorySmall(BaseModel):
    id: int
    category_name: str

    model_config = {"from_attributes": True}


class TagSmall(BaseModel):
    id: int
    tag_name: str

    model_config = {"from_attributes": True}


class MediaRead(BaseModel):
    id: int
    original_filename: str
    file_url: str
    mime_type: str
    media_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PostAuthorRead(BaseModel):
    first_name: str | None = None
    last_name: str | None = None

    model_config = {"from_attributes": True}


class PostBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    status: Literal["draft", "published"] = "draft"
    published_at: datetime | None = None

    @model_validator(mode="after")
    def set_published_at(self):
        if self.status == "draft":
            self.published_at = None
            return self
        if self.published_at is None:
            self.published_at = _now_utc()
        return self


class PostCreate(PostBase):
    category_ids: list[int] = Field(default_factory=list)
    tag_ids: list[int] = Field(default_factory=list)


class PostUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, min_length=1)
    status: Literal["draft", "published"] | None = None
    published_at: datetime | None = None
    category_ids: list[int] | None = None
    tag_ids: list[int] | None = None

    @model_validator(mode="after")
    def handle_status(self):
        if self.status is None:
            return self
        if self.status == "draft":
            self.published_at = None
            return self
        if self.published_at is None:
            self.published_at = _now_utc()
        return self


class PostRead(BaseModel):
    id: int
    user_id: int
    author: PostAuthorRead = Field(validation_alias="user")
    title: str
    description: str
    status: str
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    categories: list[CategorySmall] = []
    tags: list[TagSmall] = []
    media: list[MediaRead] = []

    model_config = {"from_attributes": True}
