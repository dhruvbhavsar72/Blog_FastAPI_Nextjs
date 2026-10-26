from datetime import datetime, timezone
from sqlalchemy import Boolean,CheckConstraint,Column,DateTime,ForeignKey,Integer,String,Table,Text,UniqueConstraint
from sqlalchemy.orm import relationship
from db.base import Base

# ============================================================
# HELPERS
# ============================================================


def utc_now():
    return datetime.now(timezone.utc)


# ============================================================
# MANY-TO-MANY: POST <-> CATEGORY
# ============================================================

post_categories = Table(
    "post_categories",
    Base.metadata,
    Column("post_id",ForeignKey("posts.id", ondelete="CASCADE"),primary_key=True,),
    Column("category_id",ForeignKey("categories.id", ondelete="CASCADE"),primary_key=True,)
)


# ============================================================
# MANY-TO-MANY: POST <-> TAG
# ============================================================

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id",ForeignKey("posts.id", ondelete="CASCADE"),primary_key=True,),
    Column("tag_id",ForeignKey("tags.id", ondelete="CASCADE"),primary_key=True,)
)


# ============================================================
# USER
# ============================================================


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100),nullable=True)
    email = Column(String(255),unique=True,nullable=False,index=True)
    phone = Column(String(20),unique=True,nullable=True,index=True)
    profile_image = Column(String(500),nullable=True)
    bio = Column(Text,nullable=True)
    is_active = Column(Boolean,default=True,nullable=False)
    is_verified = Column(Boolean,default=False,nullable=False)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)
    updated_at = Column(DateTime(timezone=True),default=utc_now,onupdate=utc_now,nullable=False)

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    # User -> Authentication accounts
    auth_accounts = relationship("AuthAccount",back_populates="user",cascade="all, delete-orphan")
    # User -> OTP codes
    otp_codes = relationship("OTPCode",back_populates="user",cascade="all, delete-orphan")
    # User -> Refresh tokens
    refresh_tokens = relationship("RefreshToken",back_populates="user",cascade="all, delete-orphan")
    # User -> Posts
    posts = relationship("Post",back_populates="user",cascade="all, delete-orphan")
    # User -> Comments
    comments = relationship("Comment",back_populates="user",cascade="all, delete-orphan")
    # User -> Categories
    categories = relationship("Category",back_populates="user",cascade="all, delete-orphan")
    # User -> Tags
    tags = relationship("Tag",back_populates="user",cascade="all, delete-orphan")
    # User -> Media
    media = relationship("Media",back_populates="user",cascade="all, delete-orphan")
    # User -> Post likes
    post_likes = relationship("PostLike",back_populates="user",cascade="all, delete-orphan")
    # User -> Comment likes
    comment_likes = relationship("CommentLike",back_populates="user",cascade="all, delete-orphan",)


# ============================================================
# AUTH ACCOUNT
# ============================================================


class AuthAccount(Base):
    """
    Stores authentication providers for a user.

    Examples:

        provider = "password"
        provider = "google"
    """

    __tablename__ = "auth_accounts"

    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=False,index=True,)
    provider = Column(String(50),nullable=False)
    provider_user_id = Column(String(255),nullable=True)
    password_hash = Column(String(255),nullable=True)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)
    updated_at = Column(DateTime(timezone=True),default=utc_now,onupdate=utc_now,nullable=False)

    
    user = relationship("User",back_populates="auth_accounts")
    __table_args__ = (
        UniqueConstraint("provider","provider_user_id",name="uq_auth_provider_user"),
        UniqueConstraint("provider","user_id",name="uq_auth_provider_user_link"),
        CheckConstraint(
            "provider IN ('password', 'google' , 'github')",
            name="ck_auth_accounts_provider",
        ),
    )


# ============================================================
# OTP
# ============================================================


class OTPCode(Base):
    """
    Used for OTP based login.

    Example:

        purpose = "login"
        purpose = "phone_verification"
        purpose = "email_verification"
    """

    __tablename__ = "otp_codes"

    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=True,index=True)
    # Email or phone to which OTP was sent
    destination = Column(String(255),nullable=False,index=True)
    # phone_verification / email_verification
    destination_type = Column(String(50),nullable=False)
    # Store a HASH of the OTP rather than the actual OTP.
    otp_hash = Column(String(255),nullable=False)
    expires_at = Column(DateTime(timezone=True),nullable=False)
    verified_at = Column(DateTime(timezone=True),nullable=True)
    attempts = Column(Integer,default=0,nullable=False)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)


    user = relationship("User",back_populates="otp_codes")


# ============================================================
# REFRESH TOKEN
# ============================================================


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer,primary_key=True,index=True,)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=False,index=True)
    refresh_token_hash = Column(String(255),nullable=False,unique=True)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)
    expires_at = Column(DateTime(timezone=True),nullable=False)
    revoked = Column(Boolean,default=False,nullable=False)
    
    
    user = relationship("User",back_populates="refresh_tokens")


# ============================================================
# CATEGORY
# ============================================================


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=False,index=True)
    category_name = Column(String(150),nullable=False)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)


    user = relationship("User",back_populates="categories")
    # M:N with Post
    posts = relationship("Post",secondary=post_categories,back_populates="categories")
    __table_args__ = (UniqueConstraint("user_id","category_name",name="uq_user_category"),)


# ============================================================
# TAG
# ============================================================


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=False,index=True)
    tag_name = Column(String(100),nullable=False)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)


    user = relationship("User",back_populates="tags")
    # M:N with Post
    posts = relationship("Post",secondary=post_tags,back_populates="tags")
    __table_args__ = (UniqueConstraint("user_id", "tag_name", name="uq_user_tag"),)


# ============================================================
# POST
# ============================================================


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=False,index=True)
    title = Column(String(200),nullable=False)
    description = Column(Text,nullable=False)
    status = Column(String(30),default="draft",nullable=False,index=True)
    published_at = Column(DateTime(timezone=True),nullable=True)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)
    updated_at = Column(DateTime(timezone=True),default=utc_now,onupdate=utc_now,nullable=False)

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    user = relationship("User",back_populates="posts")
    # M:N categories
    categories = relationship("Category",secondary=post_categories,back_populates="posts")
    # M:N tags
    tags = relationship("Tag",secondary=post_tags,back_populates="posts")
    # 1:N comments
    comments = relationship("Comment",back_populates="post",cascade="all, delete-orphan")
    # 1:N media
    media = relationship("Media",back_populates="post",cascade="all, delete-orphan")
    # 1:N likes
    likes = relationship("PostLike",back_populates="post",cascade="all, delete-orphan")


# ============================================================
# COMMENT
# ============================================================


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=False,index=True)
    post_id = Column(Integer,ForeignKey("posts.id", ondelete="CASCADE"),nullable=False,index=True)
    # Self-referencing FK for replies
    parent_id = Column(Integer,ForeignKey("comments.id", ondelete="CASCADE"),nullable=True,index=True)
    content = Column(Text,nullable=False)
    is_deleted = Column(Boolean,default=False,nullable=False)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)
    updated_at = Column(DateTime(timezone=True),default=utc_now,onupdate=utc_now,nullable=False)

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    user = relationship("User",back_populates="comments")
    post = relationship("Post",back_populates="comments")
    parent = relationship("Comment",remote_side=[id],back_populates="replies")
    # Child comments
    replies = relationship("Comment",back_populates="parent",cascade="all, delete-orphan")
    likes = relationship("CommentLike",back_populates="comment",cascade="all, delete-orphan")


# ============================================================
# MEDIA
# ============================================================


class Media(Base):
    __tablename__ = "media"

    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=False,index=True)
    post_id = Column(Integer,ForeignKey("posts.id", ondelete="CASCADE"),nullable=False,index=True)
    original_filename = Column(String(255),nullable=False)
    file_url = Column(String(1000),nullable=False)
    mime_type = Column(String(100),nullable=False)
    # image / pdf.
    media_type = Column(String(50),nullable=False)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)

    
    user = relationship("User",back_populates="media")
    post = relationship("Post",back_populates="media")


# ============================================================
# POST LIKE
# ============================================================


class PostLike(Base):
    __tablename__ = "post_likes"

    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=False)
    post_id = Column(Integer,ForeignKey("posts.id", ondelete="CASCADE"),nullable=False)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)


    user = relationship("User",back_populates="post_likes")
    post = relationship("Post",back_populates="likes")
    __table_args__ = (UniqueConstraint("user_id","post_id",name="uq_user_post_like"),)


# ============================================================
# COMMENT LIKE
# ============================================================


class CommentLike(Base):
    __tablename__ = "comment_likes"

    id = Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"),nullable=False)
    comment_id = Column(Integer,ForeignKey("comments.id", ondelete="CASCADE"),nullable=False)
    created_at = Column(DateTime(timezone=True),default=utc_now,nullable=False)


    user = relationship("User",back_populates="comment_likes")
    comment = relationship("Comment",back_populates="likes")
    __table_args__ = (UniqueConstraint("user_id","comment_id",name="uq_user_comment_like"),)
