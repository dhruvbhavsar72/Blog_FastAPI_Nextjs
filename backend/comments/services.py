from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from comments.schemas import CommentCreate, CommentUpdate
from db.models import Comment, Post


async def create_comment(
    session: AsyncSession,
    post_id: int,
    comment: CommentCreate,
    user_id: int,
):
    post = await session.scalar(select(Post.id).where(Post.id == post_id))
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if comment.parent_id is not None:
        parent = await session.scalar(
            select(Comment.id).where(
                Comment.id == comment.parent_id,
                Comment.post_id == post_id,
                Comment.is_deleted.is_(False),
            )
        )
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent comment not found for this post",
            )

    new_comment = Comment(
        user_id=user_id,
        post_id=post_id,
        parent_id=comment.parent_id,
        content=comment.content,
    )
    session.add(new_comment)
    await session.commit()
    return await get_comment_by_id(session, new_comment.id)


async def get_comments_by_post(session: AsyncSession, post_id: int):
    post = await session.scalar(select(Post.id).where(Post.id == post_id))
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    result = await session.execute(
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at)
    )
    return result.scalars().all()


async def get_comment_by_id(session: AsyncSession, comment_id: int):
    comment = await session.scalar(
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.id == comment_id)
    )
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )
    return comment


async def update_comment(
    session: AsyncSession,
    comment_id: int,
    comment: CommentUpdate,
    user_id: int,
):
    existing = await session.scalar(select(Comment).where(Comment.id == comment_id))
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )
    if existing.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to edit this comment",
        )
    if existing.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deleted comments cannot be edited",
        )

    existing.content = comment.content
    await session.commit()
    return await get_comment_by_id(session, comment_id)


async def delete_comment(
    session: AsyncSession,
    comment_id: int,
    user_id: int,
):
    existing = await session.scalar(select(Comment).where(Comment.id == comment_id))
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )
    if existing.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to delete this comment",
        )
    if existing.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment has already been deleted",
        )

    existing.is_deleted = True
    await session.commit()
    return {"message": "Comment deleted successfully"}
