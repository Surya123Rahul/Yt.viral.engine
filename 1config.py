"""
Configuration management for The Viral Engine
Load environment variables and API keys
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "The Viral Engine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]
    
    # Database
    DATABASE_URL: str = "postgresql://tve_user:tve_password@localhost:5432/tve_db"
    
    # OpenRouter Configuration
    OPENROUTER_API_KEY: str
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    
    # Model Selection
    SCRIPT_MODEL: str = "anthropic/claude-3.5-sonnet"  # or "openai/gpt-4o"
    
    # ElevenLabs Configuration
    ELEVENLABS_API_KEY: str
    ELEVENLABS_BASE_URL: str = "https://api.elevenlabs.io/v1"
    
    # Image Generation (Flux.1 via OpenRouter or specific endpoint)
    FLUX_MODEL: str = "black-forest-labs/flux-1-schnell"
    
    # Video Generation
    RUNWAY_API_KEY: str = ""
    RUNWAY_BASE_URL: str = "https://api.runwayml.com/v1"
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    OUTPUT_DIR: str = "./outputs"
    TEMP_DIR: str = "./temp"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
