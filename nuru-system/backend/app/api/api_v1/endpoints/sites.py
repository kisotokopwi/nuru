from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.site import Site
from app.models.project import Project
from app.models.user import User, UserRole
from app.models.audit_log import AuditAction
from app.schemas.site import Site as SiteSchema, SiteCreate, SiteUpdate
from app.api.deps import get_current_admin, get_current_active_user, log_audit_action

router = APIRouter()


@router.get("/", response_model=List[SiteSchema])
def read_sites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    supervisor_id: int = None,
    active_only: bool = True
) -> Any:
    """
    Retrieve sites. Supervisors can only see their assigned sites.
    """
    query = db.query(Site)
    
    # Filter based on user role
    if current_user.role == UserRole.SUPERVISOR:
        query = query.filter(Site.supervisor_id == current_user.id)
    
    if project_id:
        query = query.filter(Site.project_id == project_id)
    
    if supervisor_id and current_user.role != UserRole.SUPERVISOR:
        query = query.filter(Site.supervisor_id == supervisor_id)
    
    if active_only:
        query = query.filter(Site.is_active == True)
    
    sites = query.offset(skip).limit(limit).all()
    return sites


@router.post("/", response_model=SiteSchema)
def create_site(
    *,
    db: Session = Depends(get_db),
    site_in: SiteCreate,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Create new site. Only admins can create sites.
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == site_in.project_id).first()
    if not project:
        raise HTTPException(status_code=400, detail="Project not found")
    
    # Verify supervisor exists if specified
    if site_in.supervisor_id:
        supervisor = db.query(User).filter(
            User.id == site_in.supervisor_id,
            User.role == UserRole.SUPERVISOR,
            User.is_active == True
        ).first()
        if not supervisor:
            raise HTTPException(status_code=400, detail="Supervisor not found or invalid")
    
    # Check if site code already exists
    existing_site = db.query(Site).filter(Site.code == site_in.code).first()
    if existing_site:
        raise HTTPException(status_code=400, detail="Site code already exists")
    
    site = Site(**site_in.dict())
    db.add(site)
    db.commit()
    db.refresh(site)
    
    # Log site creation
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.CREATE,
        table_name="sites",
        record_id=site.id,
        new_values={
            "name": site.name,
            "code": site.code,
            "location": site.location,
            "project_id": site.project_id,
            "supervisor_id": site.supervisor_id
        },
        description=f"Created new site: {site.name} ({site.code})"
    )
    
    return site


@router.get("/{site_id}", response_model=SiteSchema)
def read_site(
    *,
    db: Session = Depends(get_db),
    site_id: int,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get site by ID. Supervisors can only view their assigned sites.
    """
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Check permissions for supervisors
    if current_user.role == UserRole.SUPERVISOR and site.supervisor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this site")
    
    return site


@router.put("/{site_id}", response_model=SiteSchema)
def update_site(
    *,
    db: Session = Depends(get_db),
    site_id: int,
    site_in: SiteUpdate,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Update a site. Only admins can update sites.
    """
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Store old values for audit
    old_values = {
        "name": site.name,
        "code": site.code,
        "location": site.location,
        "description": site.description,
        "project_id": site.project_id,
        "supervisor_id": site.supervisor_id,
        "latitude": site.latitude,
        "longitude": site.longitude,
        "minimum_daily_production": float(site.minimum_daily_production) if site.minimum_daily_production else None,
        "is_active": site.is_active
    }
    
    update_data = site_in.dict(exclude_unset=True)
    
    # Verify new project exists if project_id is being updated
    if "project_id" in update_data:
        project = db.query(Project).filter(Project.id == update_data["project_id"]).first()
        if not project:
            raise HTTPException(status_code=400, detail="Project not found")
    
    # Verify new supervisor exists if supervisor_id is being updated
    if "supervisor_id" in update_data and update_data["supervisor_id"]:
        supervisor = db.query(User).filter(
            User.id == update_data["supervisor_id"],
            User.role == UserRole.SUPERVISOR,
            User.is_active == True
        ).first()
        if not supervisor:
            raise HTTPException(status_code=400, detail="Supervisor not found or invalid")
    
    # Check if new code conflicts with existing site
    if "code" in update_data and update_data["code"] != site.code:
        existing_site = db.query(Site).filter(Site.code == update_data["code"]).first()
        if existing_site:
            raise HTTPException(status_code=400, detail="Site code already exists")
    
    # Update site fields
    for field, value in update_data.items():
        setattr(site, field, value)
    
    db.commit()
    db.refresh(site)
    
    # Log the update
    new_values = {
        "name": site.name,
        "code": site.code,
        "location": site.location,
        "description": site.description,
        "project_id": site.project_id,
        "supervisor_id": site.supervisor_id,
        "latitude": site.latitude,
        "longitude": site.longitude,
        "minimum_daily_production": float(site.minimum_daily_production) if site.minimum_daily_production else None,
        "is_active": site.is_active
    }
    
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        table_name="sites",
        record_id=site.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated site: {site.name} ({site.code})"
    )
    
    return site


@router.delete("/{site_id}")
def delete_site(
    *,
    db: Session = Depends(get_db),
    site_id: int,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Delete a site (soft delete by setting is_active to False).
    """
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Check if site has daily records
    if site.daily_records:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete site with existing daily records."
        )
    
    # Store site data for audit log
    site_data = {
        "name": site.name,
        "code": site.code,
        "location": site.location,
        "project_id": site.project_id,
        "supervisor_id": site.supervisor_id
    }
    
    # Soft delete
    site.is_active = False
    db.commit()
    
    # Log the deletion
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.DELETE,
        table_name="sites",
        record_id=site_id,
        old_values=site_data,
        description=f"Deactivated site: {site_data['name']} ({site_data['code']})"
    )
    
    return {"message": "Site deactivated successfully"}