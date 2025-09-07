from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.worker_type import WorkerType
from app.models.site import Site
from app.models.user import User, UserRole
from app.models.audit_log import AuditAction
from app.schemas.worker_type import WorkerType as WorkerTypeSchema, WorkerTypeCreate, WorkerTypeUpdate
from app.api.deps import get_current_admin, get_current_active_user, log_audit_action

router = APIRouter()


@router.get("/", response_model=List[WorkerTypeSchema])
def read_worker_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    site_id: int = None,
    active_only: bool = True
) -> Any:
    """
    Retrieve worker types. Filter by site if specified.
    """
    query = db.query(WorkerType)
    
    if site_id:
        query = query.filter(WorkerType.site_id == site_id)
        
        # Check if supervisor has access to this site
        if current_user.role == UserRole.SUPERVISOR:
            site = db.query(Site).filter(Site.id == site_id).first()
            if not site or site.supervisor_id != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied to this site")
    
    if active_only:
        query = query.filter(WorkerType.is_active == True)
    
    worker_types = query.offset(skip).limit(limit).all()
    return worker_types


@router.post("/", response_model=WorkerTypeSchema)
def create_worker_type(
    *,
    db: Session = Depends(get_db),
    worker_type_in: WorkerTypeCreate,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Create new worker type. Only admins can create worker types.
    """
    # Verify site exists
    site = db.query(Site).filter(Site.id == worker_type_in.site_id).first()
    if not site:
        raise HTTPException(status_code=400, detail="Site not found")
    
    worker_type = WorkerType(**worker_type_in.dict())
    db.add(worker_type)
    db.commit()
    db.refresh(worker_type)
    
    # Log worker type creation
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.CREATE,
        table_name="worker_types",
        record_id=worker_type.id,
        new_values={
            "name": worker_type.name,
            "site_id": worker_type.site_id,
            "daily_rate": float(worker_type.daily_rate),
            "currency": worker_type.currency
        },
        description=f"Created new worker type: {worker_type.name} for site {site.name}"
    )
    
    return worker_type


@router.put("/{worker_type_id}", response_model=WorkerTypeSchema)
def update_worker_type(
    *,
    db: Session = Depends(get_db),
    worker_type_id: int,
    worker_type_in: WorkerTypeUpdate,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Update a worker type. Only admins can update worker types.
    """
    worker_type = db.query(WorkerType).filter(WorkerType.id == worker_type_id).first()
    if not worker_type:
        raise HTTPException(status_code=404, detail="Worker type not found")
    
    # Store old values for audit
    old_values = {
        "name": worker_type.name,
        "description": worker_type.description,
        "site_id": worker_type.site_id,
        "daily_rate": float(worker_type.daily_rate),
        "currency": worker_type.currency,
        "minimum_tasks_per_day": worker_type.minimum_tasks_per_day,
        "task_description": worker_type.task_description,
        "production_weight": float(worker_type.production_weight) if worker_type.production_weight else None,
        "is_active": worker_type.is_active
    }
    
    update_data = worker_type_in.dict(exclude_unset=True)
    
    # Verify new site exists if site_id is being updated
    if "site_id" in update_data:
        site = db.query(Site).filter(Site.id == update_data["site_id"]).first()
        if not site:
            raise HTTPException(status_code=400, detail="Site not found")
    
    # Update worker type fields
    for field, value in update_data.items():
        setattr(worker_type, field, value)
    
    db.commit()
    db.refresh(worker_type)
    
    # Log the update
    new_values = {
        "name": worker_type.name,
        "description": worker_type.description,
        "site_id": worker_type.site_id,
        "daily_rate": float(worker_type.daily_rate),
        "currency": worker_type.currency,
        "minimum_tasks_per_day": worker_type.minimum_tasks_per_day,
        "task_description": worker_type.task_description,
        "production_weight": float(worker_type.production_weight) if worker_type.production_weight else None,
        "is_active": worker_type.is_active
    }
    
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        table_name="worker_types",
        record_id=worker_type.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated worker type: {worker_type.name}"
    )
    
    return worker_type