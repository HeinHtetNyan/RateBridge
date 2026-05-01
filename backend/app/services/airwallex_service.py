import asyncio
import time

import httpx

from app.core.config import settings

_token_cache: dict = {"token": None, "expires_at": 0.0}


class AirwallexAuthError(Exception):
    pass


class AirwallexRateError(Exception):
    pass


async def _get_token() -> str:
    if _token_cache["token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["token"]

    async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT) as client:
        response = await client.post(
            settings.AIRWALLEX_AUTH_URL,
            headers={
                "x-client-id": settings.AIRWALLEX_CLIENT_ID,
                "x-api-key": settings.AIRWALLEX_API_KEY,
            },
        )
        response.raise_for_status()
        data = response.json()

    token = data.get("token")
    if not token:
        raise AirwallexAuthError("Airwallex did not return a token")

    # Airwallex tokens expire in 30 min; cache for 25 min to be safe
    _token_cache["token"] = token
    _token_cache["expires_at"] = time.time() + 25 * 60
    return token


async def fetch_airwallex_rates() -> tuple[float, float]:
    """Returns (usd_to_thb, usd_to_eur) from Airwallex FX API."""
    if not settings.AIRWALLEX_CLIENT_ID or not settings.AIRWALLEX_API_KEY:
        raise AirwallexAuthError("Airwallex credentials not configured")

    token = await _get_token()

    async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT) as client:
        thb_task = client.get(
            settings.AIRWALLEX_QUOTE_URL,
            params={"buy_currency": "USD", "sell_currency": "THB", "buy_amount": 1},
            headers={"Authorization": f"Bearer {token}"},
        )
        eur_task = client.get(
            settings.AIRWALLEX_QUOTE_URL,
            params={"buy_currency": "USD", "sell_currency": "EUR", "buy_amount": 1},
            headers={"Authorization": f"Bearer {token}"},
        )
        thb_resp, eur_resp = await asyncio.gather(thb_task, eur_task)
        thb_resp.raise_for_status()
        eur_resp.raise_for_status()

    usd_to_thb = thb_resp.json().get("client_rate")
    usd_to_eur = eur_resp.json().get("client_rate")

    if usd_to_thb is None:
        raise AirwallexRateError("Airwallex did not return a USD/THB rate")
    if usd_to_eur is None:
        raise AirwallexRateError("Airwallex did not return a USD/EUR rate")

    return float(usd_to_thb), float(usd_to_eur)
