from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    SITE_ADMIN = "site_admin"
    SUPERVISOR = "supervisor"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.SUPERVISOR)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    supervised_sites = relationship("Site", back_populates="supervisor")
    daily_records = relationship("DailyRecord", back_populates="supervisor")
    audit_logs = relationship("AuditLog", back_populates="user")

    def __repr__(self):
        return f"<User(username={self.username}, role={self.role})>"