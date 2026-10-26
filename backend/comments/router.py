from fastapi import APIRouter, Depends, status
from comments.schemas import CommentCreate, CommentRead, CommentUpdate
from comments.services import (
    create_comment,
    delete_comment,
    get_comments_by_post,
    update_comment,
)
from db.config import SessionDep
from db.models import User
from utils import get_current_user

router = APIRouter()


@router.post(
    "/post/{post_id}",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
async def new_comment(
    post_id: int,
    comment: CommentCreate,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await create_comment(session, post_id, comment, current_user.id)


@router.get("/post/{post_id}", response_model=list[CommentRead])
async def list_comments(post_id: int, session: SessionDep):
    return await get_comments_by_post(session, post_id)


@router.put("/{comment_id}", response_model=CommentRead)
async def edit_comment(
    comment_id: int,
    comment: CommentUpdate,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await update_comment(session, comment_id, comment, current_user.id)


@router.delete("/{comment_id}")
async def remove_comment(
    comment_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_user),
):
    return await delete_comment(session, comment_id, current_user.id)
