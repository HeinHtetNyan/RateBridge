from fastapi import APIRouter, HTTPException

from app.schemas.convert_schema import ConvertRequest, ConvertResponse
from app.services.rate_service import get_rates

router = APIRouter(tags=["convert"])


@router.post("/convert", response_model=ConvertResponse)
async def convert(request: ConvertRequest):
    involves_mmk = "MMK" in (request.from_currency, request.to_currency)

    if involves_mmk and not request.use_official and request.user_rate is None:
        raise HTTPException(
            status_code=422,
            detail="user_rate is required for MMK conversions when use_official is false.",
        )

    try:
        rates = await get_rates()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch rates: {exc}")

    usd_to_thb = rates.usd_to_thb

    if request.use_official:
        mmk_per_thb = rates.thb_to_mmk
    elif request.user_rate is not None:
        mmk_per_thb = 100_000 / request.user_rate
    else:
        mmk_per_thb = rates.thb_to_mmk

    fc = request.from_currency
    tc = request.to_currency
    amount = request.amount

    if fc == "MMK" and tc == "THB":
        converted = amount / mmk_per_thb
        rate_used = mmk_per_thb

    elif fc == "THB" and tc == "MMK":
        converted = amount * mmk_per_thb
        rate_used = mmk_per_thb

    elif fc == "MMK" and tc == "USD":
        thb = amount / mmk_per_thb
        converted = thb / usd_to_thb
        rate_used = mmk_per_thb

    elif fc == "USD" and tc == "MMK":
        thb = amount * usd_to_thb
        converted = thb * mmk_per_thb
        rate_used = mmk_per_thb

    elif fc == "THB" and tc == "USD":
        converted = amount / usd_to_thb
        rate_used = usd_to_thb

    elif fc == "USD" and tc == "THB":
        converted = amount * usd_to_thb
        rate_used = usd_to_thb

    else:
        raise HTTPException(status_code=400, detail="Unsupported currency pair.")

    return ConvertResponse(
        amount=amount,
        from_currency=fc,
        to_currency=tc,
        converted_amount=round(converted, 6),
        rate_used=rate_used,
    )
