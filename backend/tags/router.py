from fastapi import APIRouter, Depends, status
from tags.schemas import TagBase, TagRead
from tags.services import get_all_tags, create_tag
from db.config import SessionDep
from db.models import User
from utils import get_current_user

router = APIRouter()


@router.post("/create_tag", response_model=TagRead, status_code=status.HTTP_201_CREATED)
async def new_tag(
    tag: TagBase, session: SessionDep, current_user: User = Depends(get_current_user)
):
    return await create_tag(session, tag, current_user.id)


@router.get("/all_tags", response_model=list[TagRead])
async def list_tags(session: SessionDep, current_user: User = Depends(get_current_user)):
    return await get_all_tags(session, current_user.id)
