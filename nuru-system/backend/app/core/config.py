from typing import List, Optional
from pydantic import BaseSettings, validator
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # Application Settings
    APP_NAME: str = "Nuru Worker Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://nuru_user:nuru_password@localhost:5432/nuru_db"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 10
    UPLOAD_DIR: str = "uploads"
    
    # Company Information
    COMPANY_NAME: str = "Nuru Company"
    COMPANY_ADDRESS: str = "Dar es Salaam, Tanzania"
    COMPANY_PHONE: str = "+255-XXX-XXXXXX"
    COMPANY_EMAIL: str = "info@nurucompany.co.tz"
    
    # Email Configuration
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()