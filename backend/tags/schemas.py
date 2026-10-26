from pydantic import BaseModel, Field


class TagBase(BaseModel):
    tag_name: str = Field(..., max_length=100)


class TagRead(TagBase):
    id: int

    model_config = {"from_attributes": True}