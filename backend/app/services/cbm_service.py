import httpx

from app.core.config import settings


async def fetch_cbm_mmk_rates() -> tuple[float, float]:
    """Returns (usd_to_mmk, thb_to_mmk) from the Central Bank of Myanmar API."""
    async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT) as client:
        response = await client.get(settings.CBM_API_URL)
        response.raise_for_status()
        data = response.json()

    rates = data.get("rates", {})

    usd_to_mmk = rates.get("USD")
    thb_to_mmk = rates.get("THB")

    if usd_to_mmk is None or thb_to_mmk is None:
        raise ValueError("CBM API did not return USD or THB rates")

    return float(usd_to_mmk), float(thb_to_mmk)
