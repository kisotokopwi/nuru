from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class WorkerType(Base):
    __tablename__ = "worker_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # e.g., "Skilled Worker", "Cleaning Worker"
    description = Column(Text, nullable=True)
    
    # Site relationship
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    
    # Rate configuration
    daily_rate = Column(Numeric(10, 2), nullable=False)  # Daily rate in TZS
    currency = Column(String(3), default="TZS")
    
    # Task requirements
    minimum_tasks_per_day = Column(Integer, nullable=True)  # Minimum tasks expected
    task_description = Column(Text, nullable=True)  # Description of expected tasks
    
    # Productivity correlation
    production_weight = Column(Numeric(5, 2), nullable=True)  # Weight for production calculation
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    site = relationship("Site", back_populates="worker_types")
    daily_record_items = relationship("DailyRecordItem", back_populates="worker_type")

    def __repr__(self):
        return f"<WorkerType(name={self.name}, daily_rate={self.daily_rate})>"