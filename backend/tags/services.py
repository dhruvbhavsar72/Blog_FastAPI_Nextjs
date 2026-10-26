from tags.schemas import TagBase
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from db.models import Tag


async def create_tag(session: AsyncSession, tag: TagBase, user_id: int):
    tag_present = select(Tag).where(Tag.tag_name == tag.tag_name, Tag.user_id == user_id)
    existing = await session.execute(tag_present)
    res = existing.scalar_one_or_none()

    if res is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tag already exists",
        )

    new_tag = Tag(tag_name=tag.tag_name, user_id=user_id)

    session.add(new_tag)
    await session.commit()
    await session.refresh(new_tag)
    return new_tag


async def get_all_tags(session: AsyncSession, user_id: int):
    tags = await session.execute(
        select(Tag).where(Tag.user_id == user_id).order_by(Tag.tag_name)
    )
    return tags.scalars().all()
