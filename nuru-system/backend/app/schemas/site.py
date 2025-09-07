from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from .project import Project
from .user import User


class SiteBase(BaseModel):
    name: str
    code: str
    location: str
    description: Optional[str] = None
    project_id: int
    supervisor_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    minimum_daily_production: Optional[float] = None
    is_active: bool = True


class SiteCreate(SiteBase):
    pass


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[int] = None
    supervisor_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    minimum_daily_production: Optional[float] = None
    is_active: Optional[bool] = None


class Site(SiteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    project: Optional[Project] = None
    supervisor: Optional[User] = None

    class Config:
        from_attributes = True