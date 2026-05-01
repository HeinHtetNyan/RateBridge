from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Currency Exchange API"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    EXCHANGE_API_URL: str = "https://api.frankfurter.dev/v1/latest"
    BINANCE_P2P_URL: str = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
    CBM_API_URL: str = "https://forex.cbm.gov.mm/api/latest"
    AIRWALLEX_CLIENT_ID: str = ""
    AIRWALLEX_API_KEY: str = ""
    AIRWALLEX_AUTH_URL: str = "https://api.airwallex.com/api/v1/authentication/login"
    AIRWALLEX_QUOTE_URL: str = "https://api.airwallex.com/api/v1/marketfx/quote"

    CACHE_TTL: int = 60
    HTTP_TIMEOUT: float = 10.0
    BINANCE_ROWS: int = 10

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8080"

    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
