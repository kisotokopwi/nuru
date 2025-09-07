from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.audit_log import AuditAction
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.api.deps import get_current_active_user, get_current_admin, log_audit_action
from app.core.security import get_password_hash

router = APIRouter()


@router.get("/", response_model=List[UserSchema])
def read_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve users. Only admins can view all users.
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserSchema)
def read_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get user by ID. Users can only view their own profile unless they are admins.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions
    if current_user.id != user_id and current_user.role not in [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return user


@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Update a user. Users can update their own profile, admins can update any user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions
    if current_user.id != user_id and current_user.role not in [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Store old values for audit
    old_values = {
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "role": user.role.value if user.role else None,
        "is_active": user.is_active
    }
    
    # Update user fields
    update_data = user_in.dict(exclude_unset=True)
    
    # Handle password update
    if "password" in update_data:
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password
    
    # Only admins can change roles and active status
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN]:
        update_data.pop("role", None)
        update_data.pop("is_active", None)
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    # Log the update
    new_values = {
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "role": user.role.value if user.role else None,
        "is_active": user.is_active
    }
    
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        table_name="users",
        record_id=user.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated user: {user.username}"
    )
    
    return user


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Delete a user. Only admins can delete users.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Store user data for audit log
    user_data = {
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value if user.role else None
    }
    
    db.delete(user)
    db.commit()
    
    # Log the deletion
    log_audit_action(
        db=db,
        user=current_user,
        action=AuditAction.DELETE,
        table_name="users",
        record_id=user_id,
        old_values=user_data,
        description=f"Deleted user: {user_data['username']}"
    )
    
    return {"message": "User deleted successfully"}


@router.get("/supervisors/available", response_model=List[UserSchema])
def get_available_supervisors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> Any:
    """
    Get list of supervisors who are not currently assigned to any site.
    """
    # Get supervisors who don't have any active site assignments
    supervisors = db.query(User).filter(
        User.role == UserRole.SUPERVISOR,
        User.is_active == True,
        ~User.supervised_sites.any()
    ).all()
    
    return supervisors