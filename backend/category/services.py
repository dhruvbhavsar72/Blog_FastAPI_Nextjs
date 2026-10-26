from category.schemas import CategoryBase
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from db.models import Category


async def create_category(session: AsyncSession, category: CategoryBase, user_id: int):
    category_present = select(Category).where(
        Category.category_name == category.category_name,
        Category.user_id == user_id,
    )
    existing = await session.execute(category_present)
    res = existing.scalar_one_or_none()

    if res is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )

    new_category = Category(category_name=category.category_name, user_id=user_id)

    session.add(new_category)
    await session.commit()
    await session.refresh(new_category)
    return new_category


async def get_all_categories(session: AsyncSession, user_id: int):
    categories = await session.execute(
        select(Category).where(Category.user_id == user_id).order_by(Category.category_name)
    )
    return categories.scalars().all()
