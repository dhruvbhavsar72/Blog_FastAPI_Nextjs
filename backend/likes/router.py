from fastapi import APIRouter, Depends
from db.config import SessionDep
from db.models import User
from likes.schemas import LikeStatus
from likes.services import (
    get_comment_like_status,
    get_post_like_status,
    like_comment,
    like_post,
    unlike_comment,
    unlike_post,
)
from utils import get_current_user

router = APIRouter()


@router.post("/posts/{post_id}", response_model=LikeStatus)
async def add_post_like(
    post_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await like_post(session, post_id, current_user.id)


@router.delete("/posts/{post_id}", response_model=LikeStatus)
async def remove_post_like(
    post_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await unlike_post(session, post_id, current_user.id)


@router.get("/posts/{post_id}", response_model=LikeStatus)
async def read_post_like_status(
    post_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await get_post_like_status(session, post_id, current_user.id)


@router.post("/comments/{comment_id}", response_model=LikeStatus)
async def add_comment_like(
    comment_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await like_comment(session, comment_id, current_user.id)


@router.delete("/comments/{comment_id}", response_model=LikeStatus)
async def remove_comment_like(
    comment_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await unlike_comment(session, comment_id, current_user.id)


@router.get("/comments/{comment_id}", response_model=LikeStatus)
async def read_comment_like_status(
    comment_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await get_comment_like_status(session, comment_id, current_user.id)
