from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    auth,
    users,
    clients,
    projects,
    sites,
    worker_types,
    daily_records,
    invoices,
    dashboard,
    reports,
    audit_logs
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(sites.router, prefix="/sites", tags=["sites"])
api_router.include_router(worker_types.router, prefix="/worker-types", tags=["worker-types"])
api_router.include_router(daily_records.router, prefix="/daily-records", tags=["daily-records"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])