from datetime import datetime, timezone
from pathlib import Path
from fastapi import HTTPException, UploadFile, status
from posts.schemas import PostCreate, PostUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from db.models import Category, Media, Post, Tag
from utils import save_upload_file

ALLOWED_POST_FILES = {
    ".jpg": ("image/jpeg", "image"),
    ".jpeg": ("image/jpeg", "image"),
    ".png": ("image/png", "image"),
    ".webp": ("image/webp", "image"),
    ".gif": ("image/gif", "image"),
    ".pdf": ("application/pdf", "pdf"),
}
MAX_POST_FILE_BYTES = 10 * 1024 * 1024


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _validate_post_file(upload_file: UploadFile) -> tuple[str, str]:
    extension = Path(upload_file.filename or "").suffix.lower()
    file_details = ALLOWED_POST_FILES.get(extension)
    if file_details is None or upload_file.content_type != file_details[0]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload an image (JPG, PNG, WEBP, GIF) or a PDF file",
        )
    return file_details


async def _add_post_file(post: Post, upload_file: UploadFile, user_id: int) -> None:
    mime_type, media_type = _validate_post_file(upload_file)
    saved_path = await save_upload_file(
        upload_file,
        "posts",
        allowed_extensions=set(ALLOWED_POST_FILES),
        max_bytes=MAX_POST_FILE_BYTES,
    )
    post.media.append(
        Media(
            user_id=user_id,
            original_filename=Path(upload_file.filename or "").name,
            file_url=f"/{saved_path}",
            mime_type=mime_type,
            media_type=media_type,
        )
    )


def _post_details_query():
    return (
        selectinload(Post.user),
        selectinload(Post.categories),
        selectinload(Post.tags),
        selectinload(Post.media),
    )


async def _get_post_details(session: AsyncSession, post_id: int) -> Post:
    result = await session.execute(
        select(Post).options(*_post_details_query()).where(Post.id == post_id)
    )
    return result.scalar_one()


async def create_post(
    session: AsyncSession,
    post: PostCreate,
    user_id: int,
    upload_file: UploadFile | None = None,
):
    published_at = post.published_at
    if post.status == "draft":
        published_at = None
    elif published_at is None:
        published_at = _now_utc()

    new_post = Post(
        title=post.title,
        description=post.description,
        status=post.status,
        published_at=published_at,
        user_id=user_id,
        categories=[],
        tags=[],
        media=[],
    )

    session.add(new_post)
    await session.flush()

    if post.category_ids:
        categories = await session.scalars(
            select(Category).where(
                Category.id.in_(post.category_ids), Category.user_id == user_id
            )
        )
        new_post.categories = list(categories)

    if post.tag_ids:
        tags = await session.scalars(
            select(Tag).where(Tag.id.in_(post.tag_ids), Tag.user_id == user_id)
        )
        new_post.tags = list(tags)

    if upload_file is not None:
        await _add_post_file(new_post, upload_file, user_id)

    await session.commit()
    return await _get_post_details(session, new_post.id)


async def edit_post(
    session: AsyncSession,
    post_id: int,
    post: PostUpdate,
    user_id: int,
    upload_file: UploadFile | None = None,
):
    post_present = (
        select(Post)
        .options(
            selectinload(Post.categories),
            selectinload(Post.tags),
            selectinload(Post.media),
        )
        .where(Post.id == post_id)
    )
    existing = await session.execute(post_present)
    res = existing.scalar_one_or_none()

    if res is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if res.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to edit this post",
        )

    updates = post.model_dump(exclude_unset=True)

    if "status" in updates:
        new_status = updates["status"]
        if new_status == "draft":
            res.status = "draft"
            res.published_at = None
        elif new_status == "published":
            res.status = "published"
            if "published_at" in updates and updates["published_at"] is not None:
                res.published_at = updates["published_at"]
            elif res.published_at is None:
                res.published_at = _now_utc()

    for key, value in updates.items():
        if key in {"title", "description"}:
            setattr(res, key, value)
        elif key == "published_at" and res.status == "published":
            res.published_at = value

    if "category_ids" in updates:
        category_ids = updates["category_ids"] or []
        if category_ids:
            categories = await session.scalars(
                select(Category).where(
                    Category.id.in_(category_ids), Category.user_id == user_id
                )
            )
            res.categories = list(categories)
        else:
            res.categories = []

    if "tag_ids" in updates:
        tag_ids = updates["tag_ids"] or []
        if tag_ids:
            tags = await session.scalars(
                select(Tag).where(Tag.id.in_(tag_ids), Tag.user_id == user_id)
            )
            res.tags = list(tags)
        else:
            res.tags = []

    old_media_urls = []
    if upload_file is not None:
        old_media_urls = [media.file_url for media in res.media]
        res.media.clear()
        await _add_post_file(res, upload_file, user_id)

    session.add(res)
    await session.commit()
    for file_url in old_media_urls:
        _remove_post_file(file_url)
    return await _get_post_details(session, post_id)


def _remove_post_file(file_url: str) -> None:
    if not file_url.startswith("/media/posts/"):
        return

    file_path = Path("media") / "posts" / Path(file_url).name
    if file_path.exists():
        file_path.unlink()


async def delete_post(session: AsyncSession, post_id: int, user_id: int):
    post_present = (
        select(Post).options(selectinload(Post.media)).where(Post.id == post_id)
    )
    existing = await session.execute(post_present)
    res = existing.scalar_one_or_none()

    if res is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if res.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to delete this post",
        )

    media_urls = [media.file_url for media in res.media]
    await session.delete(res)
    await session.commit()
    for file_url in media_urls:
        _remove_post_file(file_url)
    return {"message": "Post deleted successfully"}


async def get_post_by_user(session: AsyncSession, user_id: int):
    posts = await session.execute(
        select(Post)
        .options(*_post_details_query())
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
    )
    return posts.scalars().all()


async def get_all_posts(session: AsyncSession):
    posts = await session.execute(
        select(Post)
        .options(*_post_details_query())
        .where(Post.status == "published")
        .order_by(Post.published_at.desc(), Post.created_at.desc())
    )
    return posts.scalars().all()


async def get_post_by_id(session: AsyncSession, post_id: int):
    post = await session.scalar(
        select(Post).options(*_post_details_query()).where(Post.id == post_id)
    )
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    return post
