from typing import Literal

from pydantic import BaseModel


class LikeStatus(BaseModel):
    target_id: int
    target_type: Literal["post", "comment"]
    liked: bool
    like_count: int
