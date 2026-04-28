from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import convert, rates

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list(),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rates.router, prefix=settings.API_PREFIX)
app.include_router(convert.router, prefix=settings.API_PREFIX)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
