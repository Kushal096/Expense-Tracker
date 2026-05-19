"""AI and Ollama configuration."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AISettings(BaseSettings):
    """Runtime settings for the local AI assistant."""

    model_config = SettingsConfigDict(env_prefix="OLLAMA_", extra="ignore")

    base_url: str = Field(default="http://localhost:11434")
    default_model: str = Field(default="llama3.1:8b")
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    timeout_seconds: float = Field(default=30.0, gt=0.0)
    max_retries: int = Field(default=2, ge=0)
    retry_delay_seconds: float = Field(default=0.75, ge=0.0)
    max_history_messages: int = Field(default=10, ge=0, le=50)
    request_timeout_buffer: float = Field(default=5.0, ge=0.0)


@lru_cache(maxsize=1)
def get_ai_settings() -> AISettings:
    """Return cached AI settings."""

    return AISettings()
