from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class ConvertRequest(BaseModel):
    amount: float = Field(gt=0)
    from_currency: Literal["MMK", "THB", "USD"]
    to_currency: Literal["MMK", "THB", "USD"]
    user_rate: Optional[float] = Field(None, gt=0)
    use_official: bool = False

    @model_validator(mode="after")
    def currencies_must_differ(self) -> "ConvertRequest":
        if self.from_currency == self.to_currency:
            raise ValueError("from_currency and to_currency must be different")
        return self


class ConvertResponse(BaseModel):
    amount: float
    from_currency: str
    to_currency: str
    converted_amount: float
    rate_used: float
