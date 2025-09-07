from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Client relationship
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Project timeline
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Project settings
    requires_production_tracking = Column(Boolean, default=True)
    production_unit = Column(String(20), default="tons")  # tons, pieces, etc.
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    client = relationship("Client", back_populates="projects")
    sites = relationship("Site", back_populates="project")

    def __repr__(self):
        return f"<Project(name={self.name}, code={self.code})>"