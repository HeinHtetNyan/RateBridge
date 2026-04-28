from fastapi import APIRouter, HTTPException

from app.schemas.rate_schema import RateResponse
from app.services.rate_service import get_rates

router = APIRouter(tags=["rates"])


@router.get("/rates", response_model=RateResponse)
async def reference_rates():
    try:
        return await get_rates()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch rates: {exc}")
