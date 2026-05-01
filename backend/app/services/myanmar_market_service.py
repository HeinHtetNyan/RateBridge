import httpx

from app.core.config import settings


class MyanmarMarketError(Exception):
    pass


async def fetch_mmk_rates() -> tuple[float, float]:
    """Returns (usd_to_mmk, thb_to_mmk) from Myanmar Market API using sell rates."""
    if not settings.MYANMAR_MARKET_API_KEY:
        raise MyanmarMarketError("MYANMAR_MARKET_API_KEY not configured")

    async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT) as client:
        response = await client.get(
            f"{settings.MYANMAR_MARKET_BASE_URL}/currencies/latest-rates",
            params={"isVisible": "true"},
            headers={"x-api-key": settings.MYANMAR_MARKET_API_KEY},
        )
        response.raise_for_status()
        data = response.json()

    by_code = {r["currency"]["code"]: r for r in data.get("latestRates", [])}

    usd = by_code.get("USD")
    thb = by_code.get("THB")

    if not usd:
        raise MyanmarMarketError("Myanmar Market API did not return a USD rate")
    if not thb:
        raise MyanmarMarketError("Myanmar Market API did not return a THB rate")

    usd_to_mmk = float(usd["sellRate"])
    thb_to_mmk = float(thb["sellRate"])

    return usd_to_mmk, thb_to_mmk
