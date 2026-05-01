import asyncio
from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.schemas.rate_schema import RateResponse
from app.services import cache_service
from app.services.airwallex_service import AirwallexAuthError, AirwallexRateError, fetch_airwallex_rates
from app.services.binance_service import GeoBlockedError, fetch_usdt_mmk_rate
from app.services.cbm_service import fetch_cbm_mmk_rates

_CACHE_KEY = "rates"


async def get_rates() -> RateResponse:
    cached = cache_service.get(_CACHE_KEY)
    if cached is not None:
        return cached

    (usd_to_thb, usd_to_eur, fiat_source), (usd_to_mmk, thb_to_mmk, mmk_source) = await asyncio.gather(
        _fetch_fiat_rates(),
        _fetch_mmk_rates(),
    )

    eur_to_mmk = usd_to_mmk / usd_to_eur

    rates = RateResponse(
        usd_to_thb=usd_to_thb,
        usd_to_eur=usd_to_eur,
        usd_to_mmk=usd_to_mmk,
        thb_to_mmk=thb_to_mmk,
        eur_to_mmk=eur_to_mmk,
        updated_at=datetime.now(timezone.utc),
        mmk_source=mmk_source,
        fiat_source=fiat_source,
    )
    cache_service.set(_CACHE_KEY, rates, settings.CACHE_TTL)
    return rates


async def _fetch_fiat_rates() -> tuple[float, float, str]:
    """Returns (usd_to_thb, usd_to_eur, source). Tries Airwallex first, falls back to Frankfurter."""
    try:
        usd_to_thb, usd_to_eur = await fetch_airwallex_rates()
        return usd_to_thb, usd_to_eur, "airwallex"
    except (AirwallexAuthError, AirwallexRateError, Exception):
        usd_to_thb, usd_to_eur = await _fetch_frankfurter_rates()
        return usd_to_thb, usd_to_eur, "frankfurter"


async def _fetch_mmk_rates() -> tuple[float, float, str]:
    """Returns (usd_to_mmk, thb_to_mmk, source). Tries Binance P2P first, falls back to CBM."""
    try:
        usd_to_mmk = await fetch_usdt_mmk_rate()
        usd_to_thb, _ = await _fetch_frankfurter_rates()
        thb_to_mmk = usd_to_mmk / usd_to_thb
        return usd_to_mmk, thb_to_mmk, "binance_p2p"
    except GeoBlockedError:
        usd_to_mmk, thb_to_mmk = await fetch_cbm_mmk_rates()
        return usd_to_mmk, thb_to_mmk, "cbm_official"


async def _fetch_frankfurter_rates() -> tuple[float, float]:
    """Returns (usd_to_thb, usd_to_eur) from Frankfurter."""
    async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT) as client:
        response = await client.get(f"{settings.EXCHANGE_API_URL}?from=USD")
        response.raise_for_status()
        data = response.json()

    rates = data.get("rates", {})
    thb = rates.get("THB")
    eur = rates.get("EUR")
    if thb is None:
        raise ValueError("Frankfurter API did not return a THB rate")
    if eur is None:
        raise ValueError("Frankfurter API did not return a EUR rate")
    return float(thb), float(eur)
