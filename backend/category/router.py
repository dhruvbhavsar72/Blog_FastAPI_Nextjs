from fastapi import APIRouter, Depends, status
from category.services import get_all_categories, create_category
from category.schemas import CategoryBase, CategoryRead
from db.config import SessionDep
from db.models import User
from utils import get_current_user

router = APIRouter()


@router.post("/create_category", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def new_category(
    category: CategoryBase, session: SessionDep, current_user: User = Depends(get_current_user)
):
    return await create_category(session, category, current_user.id)


@router.get("/all_categories", response_model=list[CategoryRead])
async def list_categories(session: SessionDep, current_user: User = Depends(get_current_user)):
    return await get_all_categories(session, current_user.id)
