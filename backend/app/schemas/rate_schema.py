from datetime import datetime

from pydantic import BaseModel


class RateResponse(BaseModel):
    usd_to_thb: float
    usd_to_mmk: float
    thb_to_mmk: float
    updated_at: datetime
    mmk_source: str  # "binance_p2p" | "cbm_official"
