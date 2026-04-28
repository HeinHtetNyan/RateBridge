import statistics

import httpx

from app.core.config import settings


class GeoBlockedError(Exception):
    pass

def _build_payload() -> dict:
    return {
        "asset": "USDT",
        "fiat": "MMK",
        "tradeType": "SELL",
        "page": 1,
        "rows": settings.BINANCE_ROWS,
    }

_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}


async def fetch_usdt_mmk_rate() -> float:
    async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT) as client:
        response = await client.post(
            settings.BINANCE_P2P_URL,
            json=_build_payload(),
            headers=_HEADERS,
        )
        response.raise_for_status()
        data = response.json()

    if data.get("code") != "000000":
        raise ValueError(f"Binance P2P error: {data.get('message', 'unknown')}")

    ads = data.get("data", [])
    if not ads:
        raise GeoBlockedError("Binance P2P returned no listings — server may be outside Myanmar")

    prices = [float(ad["adv"]["price"]) for ad in ads]
    return statistics.median(prices)
