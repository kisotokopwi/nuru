from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    location = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Project relationship
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Supervisor assignment (one supervisor per site)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Site coordinates (optional for mapping)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Site-specific settings
    minimum_daily_production = Column(Float, nullable=True)  # Minimum expected daily output
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="sites")
    supervisor = relationship("User", back_populates="supervised_sites")
    worker_types = relationship("WorkerType", back_populates="site")
    daily_records = relationship("DailyRecord", back_populates="site")

    def __repr__(self):
        return f"<Site(name={self.name}, code={self.code})>"