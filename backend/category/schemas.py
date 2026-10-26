from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    category_name: str = Field(..., max_length=100)


class CategoryRead(CategoryBase):
    id: int

    model_config = {"from_attributes": True}