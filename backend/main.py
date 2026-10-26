from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from users.router import router as accounts_router
from category.router import router as category_router
from tags.router import router as tags_router
from posts.router import router as posts_router
from comments.router import router as comments_router
from likes.router import router as likes_router
from fastapi.middleware.cors import CORSMiddleware
from decouple import config

CORS_ORIGINS = [
    origin.strip()
    for origin in config(
        "CORS_ORIGINS",
        default="http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app = FastAPI(
    title="Blog API",
    description="This is a sample Blog FastAPI application.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts_router, prefix="/users", tags=["Users"])
app.include_router(category_router, prefix="/categories", tags=["Categories"])
app.include_router(tags_router, prefix="/tags", tags=["Tags"])
app.include_router(posts_router, prefix="/posts", tags=["Posts"])
app.include_router(comments_router, prefix="/comments", tags=["Comments"])
app.include_router(likes_router, prefix="/likes", tags=["Likes"])
app.mount("/media", StaticFiles(directory="media"), name="media")
