from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.project import Project
from app.models.client import Client
from app.models.user import User
from app.models.audit_log import AuditAction
from app.schemas.project import Project as ProjectSchema, ProjectCreate, ProjectUpdate
from app.api.deps import get_current_admin, log_audit_action

router = APIRouter()


@router.get("/", response_model=List[ProjectSchema])
def read_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 100,
    client_id: int = None,
    active_only: bool = True
) -> Any:
    """
    Retrieve projects. Filter by client if specified.
    """
    query = db.query(Project)
    
    if client_id:
        query = query.filter(Project.client_id == client_id)
    
    if active_only:
        query = query.filter(Project.is_active == True)
    
    projects = query.offset(skip).limit(limit).all()
    return projects


@router.post("/", response_model=ProjectSchema)
def create_project(
    *,
    db: Session = Depends(get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Create new project.
    """
    # Verify client exists
    client = db.query(Client).filter(Client.id == project_in.client_id).first()
    if not client:
        raise HTTPException(status_code=400, detail="Client not found")
    
    # Check if project code already exists
    existing_project = db.query(Project).filter(Project.code == project_in.code).first()
    if existing_project:
        raise HTTPException(status_code=400, detail="Project code already exists")
    
    project = Project(**project_in.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Log project creation
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.CREATE,
        table_name="projects",
        record_id=project.id,
        new_values={
            "name": project.name,
            "code": project.code,
            "client_id": project.client_id,
            "description": project.description
        },
        description=f"Created new project: {project.name} ({project.code})"
    )
    
    return project


@router.get("/{project_id}", response_model=ProjectSchema)
def read_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Get project by ID.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project


@router.put("/{project_id}", response_model=ProjectSchema)
def update_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Update a project.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Store old values for audit
    old_values = {
        "name": project.name,
        "code": project.code,
        "description": project.description,
        "client_id": project.client_id,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "requires_production_tracking": project.requires_production_tracking,
        "production_unit": project.production_unit,
        "is_active": project.is_active
    }
    
    update_data = project_in.dict(exclude_unset=True)
    
    # Verify new client exists if client_id is being updated
    if "client_id" in update_data:
        client = db.query(Client).filter(Client.id == update_data["client_id"]).first()
        if not client:
            raise HTTPException(status_code=400, detail="Client not found")
    
    # Check if new code conflicts with existing project
    if "code" in update_data and update_data["code"] != project.code:
        existing_project = db.query(Project).filter(Project.code == update_data["code"]).first()
        if existing_project:
            raise HTTPException(status_code=400, detail="Project code already exists")
    
    # Update project fields
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    # Log the update
    new_values = {
        "name": project.name,
        "code": project.code,
        "description": project.description,
        "client_id": project.client_id,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "requires_production_tracking": project.requires_production_tracking,
        "production_unit": project.production_unit,
        "is_active": project.is_active
    }
    
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        table_name="projects",
        record_id=project.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated project: {project.name} ({project.code})"
    )
    
    return project


@router.delete("/{project_id}")
def delete_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Delete a project (soft delete by setting is_active to False).
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if project has active sites
    if project.sites:
        active_sites = [s for s in project.sites if s.is_active]
        if active_sites:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete project with active sites. Deactivate sites first."
            )
    
    # Store project data for audit log
    project_data = {
        "name": project.name,
        "code": project.code,
        "description": project.description,
        "client_id": project.client_id
    }
    
    # Soft delete
    project.is_active = False
    db.commit()
    
    # Log the deletion
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.DELETE,
        table_name="projects",
        record_id=project_id,
        old_values=project_data,
        description=f"Deactivated project: {project_data['name']} ({project_data['code']})"
    )
    
    return {"message": "Project deactivated successfully"}