from datetime import datetime
from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    parent_id: int | None = None


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class CommentAuthor(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None

    model_config = {"from_attributes": True}


class CommentRead(BaseModel):
    id: int
    user_id: int
    post_id: int
    parent_id: int | None
    content: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    user: CommentAuthor

    model_config = {"from_attributes": True}
