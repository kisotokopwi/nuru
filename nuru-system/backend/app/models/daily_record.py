from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, ForeignKey, Numeric, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class DailyRecord(Base):
    __tablename__ = "daily_records"

    id = Column(Integer, primary_key=True, index=True)
    
    # Date and site information
    record_date = Column(Date, nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Production tracking
    total_production = Column(Numeric(10, 2), nullable=True)  # Total tons/units produced
    production_unit = Column(String(20), default="tons")
    
    # Task completion metrics
    tasks_completed = Column(Integer, nullable=True)
    task_completion_notes = Column(Text, nullable=True)
    
    # Weather and site conditions
    weather_conditions = Column(String(100), nullable=True)
    site_conditions_notes = Column(Text, nullable=True)
    
    # Supervisor notes
    supervisor_notes = Column(Text, nullable=True)
    
    # System tracking
    is_locked = Column(Boolean, default=False)  # Locked after the day passes
    correction_count = Column(Integer, default=0)  # Track same-day corrections
    last_correction_reason = Column(String(200), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    locked_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    site = relationship("Site", back_populates="daily_records")
    supervisor = relationship("User", back_populates="daily_records")
    record_items = relationship("DailyRecordItem", back_populates="daily_record", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="daily_record")

    def __repr__(self):
        return f"<DailyRecord(date={self.record_date}, site={self.site_id})>"


class DailyRecordItem(Base):
    __tablename__ = "daily_record_items"

    id = Column(Integer, primary_key=True, index=True)
    
    # Parent record
    daily_record_id = Column(Integer, ForeignKey("daily_records.id"), nullable=False)
    worker_type_id = Column(Integer, ForeignKey("worker_types.id"), nullable=False)
    
    # Worker count and payments
    worker_count = Column(Integer, nullable=False)  # Actual workers who showed up
    total_payment = Column(Numeric(10, 2), nullable=False)  # Total amount paid to this worker type
    payment_per_worker = Column(Numeric(10, 2), nullable=False)  # Amount per worker
    
    # Individual worker names (optional, JSON array)
    worker_names = Column(JSON, nullable=True)  # ["John Doe", "Jane Smith", ...]
    
    # Performance metrics
    productivity_score = Column(Numeric(5, 2), nullable=True)  # Performance rating
    attendance_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    daily_record = relationship("DailyRecord", back_populates="record_items")
    worker_type = relationship("WorkerType", back_populates="daily_record_items")

    def __repr__(self):
        return f"<DailyRecordItem(worker_type={self.worker_type_id}, count={self.worker_count})>"