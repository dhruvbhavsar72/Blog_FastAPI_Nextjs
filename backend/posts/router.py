from datetime import datetime
from typing import Literal
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from utils import get_current_user
from posts.schemas import PostCreate, PostRead, PostUpdate
from posts.services import (
    create_post,
    delete_post,
    edit_post,
    get_all_posts,
    get_post_by_id,
    get_post_by_user,
)
from db.config import SessionDep
from db.models import User

router = APIRouter()


@router.post(
    "/create_post", response_model=PostRead, status_code=status.HTTP_201_CREATED
)
async def new_post(
    session: SessionDep,
    title: str = Form(..., min_length=1, max_length=200),
    description: str = Form(..., min_length=1),
    status_value: Literal["draft", "published"] = Form("draft", alias="status"),
    published_at: datetime | None = Form(None),
    category_ids: list[int] = Form([]),
    tag_ids: list[int] = Form([]),
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
):
    post = PostCreate(
        title=title,
        description=description,
        status=status_value,
        published_at=published_at,
        category_ids=category_ids,
        tag_ids=tag_ids,
    )
    return await create_post(session, post, current_user.id, file)


@router.put("/edit_post/{post_id}", response_model=PostRead)
async def update_post(
    post_id: int,
    session: SessionDep,
    title: str | None = Form(None, min_length=1, max_length=200),
    description: str | None = Form(None, min_length=1),
    status_value: Literal["draft", "published"] | None = Form(None, alias="status"),
    published_at: datetime | None = Form(None),
    category_ids: list[int] | None = Form(None),
    tag_ids: list[int] | None = Form(None),
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
):
    post_data = {
        "title": title,
        "description": description,
        "status": status_value,
        "published_at": published_at,
        "category_ids": category_ids,
        "tag_ids": tag_ids,
    }
    post = PostUpdate(
        **{key: value for key, value in post_data.items() if value is not None}
    )
    return await edit_post(session, post_id, post, current_user.id, file)


@router.delete("/delete_post/{post_id}")
async def remove_post(
    post_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await delete_post(session, post_id, current_user.id)


@router.get("/posts_by_user", response_model=list[PostRead])
async def list_posts_by_user(
    session: SessionDep, current_user: User = Depends(get_current_user)
):
    return await get_post_by_user(session, current_user.id)


@router.get("/all_posts", response_model=list[PostRead])
async def list_posts(session: SessionDep):
    return await get_all_posts(session)


@router.get("/{post_id}", response_model=PostRead)
async def read_post(post_id: int, session: SessionDep):
    return await get_post_by_id(session, post_id)
