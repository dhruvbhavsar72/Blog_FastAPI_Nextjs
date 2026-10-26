from typing import Literal
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import Comment, CommentLike, Post, PostLike
from likes.schemas import LikeStatus


async def _check_target_exists(
    session: AsyncSession,
    target_id: int,
    target_type: str,
) -> None:
    if target_type == "post":
        target = await session.scalar(select(Post.id).where(Post.id == target_id))
    else:
        target = await session.scalar(
            select(Comment.id).where(
                Comment.id == target_id,
                Comment.is_deleted.is_(False),
            )
        )

    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{target_type.capitalize()} not found",
        )


async def _get_like_status(
    session: AsyncSession,
    target_id: int,
    user_id: int,
    target_type: Literal["post", "comment"],
) -> LikeStatus:
    await _check_target_exists(session, target_id, target_type)

    if target_type == "post":
        like_model = PostLike
        target_column = PostLike.post_id
    else:
        like_model = CommentLike
        target_column = CommentLike.comment_id

    like_count = await session.scalar(
        select(func.count()).select_from(like_model).where(target_column == target_id)
    )
    user_like = await session.scalar(
        select(like_model.id).where(
            target_column == target_id,
            like_model.user_id == user_id,
        )
    )

    return LikeStatus(
        target_id=target_id,
        target_type=target_type,
        liked=user_like is not None,
        like_count=like_count or 0,
    )


async def _add_like(
    session: AsyncSession,
    target_id: int,
    user_id: int,
    target_type: Literal["post", "comment"],
) -> LikeStatus:
    await _check_target_exists(session, target_id, target_type)

    if target_type == "post":
        like_model = PostLike
        target_column = PostLike.post_id
        like = PostLike(user_id=user_id, post_id=target_id)
    else:
        like_model = CommentLike
        target_column = CommentLike.comment_id
        like = CommentLike(user_id=user_id, comment_id=target_id)

    existing_like = await session.scalar(
        select(like_model.id).where(
            target_column == target_id,
            like_model.user_id == user_id,
        )
    )
    if existing_like is None:
        session.add(like)
        await session.commit()

    return await _get_like_status(session, target_id, user_id, target_type)


async def _remove_like(
    session: AsyncSession,
    target_id: int,
    user_id: int,
    target_type: Literal["post", "comment"],
) -> LikeStatus:
    await _check_target_exists(session, target_id, target_type)

    if target_type == "post":
        like_model = PostLike
        target_column = PostLike.post_id
    else:
        like_model = CommentLike
        target_column = CommentLike.comment_id

    existing_like = await session.scalar(
        select(like_model).where(
            target_column == target_id,
            like_model.user_id == user_id,
        )
    )
    if existing_like is not None:
        await session.delete(existing_like)
        await session.commit()

    return await _get_like_status(session, target_id, user_id, target_type)


async def like_post(
    session: AsyncSession, post_id: int, user_id: int
) -> LikeStatus:
    return await _add_like(session, post_id, user_id, "post")


async def unlike_post(
    session: AsyncSession, post_id: int, user_id: int
) -> LikeStatus:
    return await _remove_like(session, post_id, user_id, "post")


async def get_post_like_status(
    session: AsyncSession, post_id: int, user_id: int
) -> LikeStatus:
    return await _get_like_status(session, post_id, user_id, "post")


async def like_comment(
    session: AsyncSession, comment_id: int, user_id: int
) -> LikeStatus:
    return await _add_like(session, comment_id, user_id, "comment")


async def unlike_comment(
    session: AsyncSession, comment_id: int, user_id: int
) -> LikeStatus:
    return await _remove_like(session, comment_id, user_id, "comment")


async def get_comment_like_status(
    session: AsyncSession, comment_id: int, user_id: int
) -> LikeStatus:
    return await _get_like_status(session, comment_id, user_id, "comment")
