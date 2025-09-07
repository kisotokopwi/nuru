# Nuru System - Project Structure

## 📁 Directory Overview

```
nuru-system/
├── backend/                    # FastAPI backend application
│   ├── app/                   # Main application package
│   │   ├── api/              # API routes and endpoints
│   │   │   ├── api_v1/       # Version 1 API routes
│   │   │   │   ├── endpoints/# Individual endpoint modules
│   │   │   │   └── api.py    # API router configuration
│   │   │   └── deps.py       # Dependency injection functions
│   │   ├── core/             # Core functionality
│   │   │   ├── config.py     # Application configuration
│   │   │   └── security.py   # Authentication and security
│   │   ├── db/               # Database configuration
│   │   │   └── base.py       # Database connection and session
│   │   ├── models/           # SQLAlchemy database models
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── services/         # Business logic layer
│   │   ├── utils/            # Utility functions
│   │   └── main.py           # FastAPI application entry point
│   ├── migrations/           # Alembic database migrations
│   ├── tests/                # Backend tests
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment variables template
│   ├── alembic.ini          # Alembic configuration
│   └── create_admin.py      # Super admin creation script
├── frontend/                  # React TypeScript frontend
│   ├── public/               # Static public files
│   ├── src/                  # Source code
│   │   ├── components/       # Reusable React components
│   │   │   └── Layout/       # Layout components (Header, Sidebar, etc.)
│   │   ├── contexts/         # React Context providers
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service functions
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Utility functions
│   │   └── App.tsx           # Main application component
│   ├── package.json          # Node.js dependencies
│   └── .env                  # Environment variables
├── docs/                     # Documentation
│   └── DEVELOPMENT.md        # Development guide
├── scripts/                  # Setup and utility scripts
│   ├── setup.sh             # Initial setup script
│   └── test_setup.py        # Setup verification script
├── README.md                 # Project overview and setup
└── PROJECT_STRUCTURE.md     # This file
```

## 🔧 Backend Structure Details

### `/app` - Main Application Package

#### `/api` - API Layer
- **Purpose**: Handle HTTP requests and responses
- **Structure**: Organized by API version (v1, v2, etc.)
- **Key Files**:
  - `deps.py`: Authentication and dependency injection
  - `api_v1/api.py`: Main API router configuration
  - `endpoints/`: Individual endpoint modules (auth, users, clients, etc.)

#### `/core` - Core Functionality
- **Purpose**: Application configuration and security
- **Key Files**:
  - `config.py`: Environment-based configuration using Pydantic
  - `security.py`: JWT authentication, password hashing

#### `/db` - Database Layer
- **Purpose**: Database connection and session management
- **Key Files**:
  - `base.py`: SQLAlchemy engine, session, and dependency injection

#### `/models` - Data Models
- **Purpose**: SQLAlchemy ORM models representing database tables
- **Structure**: One file per major entity
- **Key Models**:
  - `user.py`: User authentication and roles
  - `client.py`: Client companies
  - `project.py`: Client projects
  - `site.py`: Work sites
  - `worker_type.py`: Worker categories and rates
  - `daily_record.py`: Daily work records
  - `invoice.py`: Invoice generation and tracking
  - `audit_log.py`: System audit trail

#### `/schemas` - Request/Response Models
- **Purpose**: Pydantic models for API request/response validation
- **Structure**: Mirrors the models structure
- **Benefits**: Automatic validation, serialization, and API documentation

#### `/services` - Business Logic
- **Purpose**: Complex business logic and data processing
- **Structure**: Service classes for major features
- **Examples**: Invoice generation, report creation, audit logging

### Database Migration System
- **Tool**: Alembic for version-controlled database migrations
- **Location**: `/migrations` directory
- **Configuration**: `alembic.ini` file

## 🎨 Frontend Structure Details

### `/src` - Source Code

#### `/components` - Reusable Components
- **Purpose**: Shared UI components used across multiple pages
- **Structure**: Organized by feature or type
- **Examples**:
  - `Layout/`: Application shell components
  - `Forms/`: Reusable form components
  - `Tables/`: Data display components

#### `/contexts` - State Management
- **Purpose**: React Context providers for global state
- **Key Contexts**:
  - `AuthContext`: User authentication and authorization
  - `ThemeContext`: Application theming
  - `NotificationContext`: Global notifications

#### `/hooks` - Custom Hooks
- **Purpose**: Reusable stateful logic
- **Examples**:
  - `useApi`: API call management
  - `useLocalStorage`: Local storage integration
  - `usePermissions`: Role-based permissions

#### `/pages` - Page Components
- **Purpose**: Top-level page components for routing
- **Structure**: One file per route
- **Examples**:
  - `Login.tsx`: Authentication page
  - `Dashboard.tsx`: Main dashboard
  - `Clients.tsx`: Client management

#### `/services` - API Integration
- **Purpose**: HTTP client and API service functions
- **Structure**: One service file per backend module
- **Key Services**:
  - `api.ts`: Axios configuration and interceptors
  - `auth.ts`: Authentication API calls
  - `clients.ts`: Client management API calls

#### `/types` - TypeScript Definitions
- **Purpose**: Type definitions for the entire application
- **Structure**: Organized by feature
- **Benefits**: Type safety, IntelliSense, documentation

## 🗃️ Database Schema Overview

### Core Entities

1. **Users** (`users`)
   - System users with role-based access
   - Roles: Super Admin, Site Admin, Supervisor

2. **Clients** (`clients`)
   - Client companies (GSM, etc.)
   - Invoice customization settings

3. **Projects** (`projects`)
   - Client projects with production tracking

4. **Sites** (`sites`)
   - Work locations under projects
   - Supervisor assignments

5. **Worker Types** (`worker_types`)
   - Configurable worker categories
   - Daily rates and task definitions

6. **Daily Records** (`daily_records`)
   - Daily work and payment records
   - Production metrics and notes

7. **Daily Record Items** (`daily_record_items`)
   - Detailed worker counts and payments by type

8. **Invoices** (`invoices`)
   - Dual invoice system (client and internal)
   - PDF generation and status tracking

9. **Invoice Items** (`invoice_items`)
   - Line items for invoices

10. **Audit Logs** (`audit_logs`)
    - Complete system activity tracking
    - Fraud prevention and transparency

### Key Relationships

- **User → Sites**: One supervisor per site
- **Client → Projects**: One-to-many relationship
- **Project → Sites**: One-to-many relationship
- **Site → Worker Types**: One-to-many relationship
- **Site → Daily Records**: One-to-many relationship
- **Daily Record → Invoice**: One-to-many relationship (dual invoices)

## 🔐 Security Architecture

### Authentication Flow
1. User submits credentials to `/auth/login`
2. Backend validates credentials and returns JWT token
3. Frontend stores token and includes in all API requests
4. Backend validates token on each request

### Authorization Levels
- **Super Admin**: Full system access
- **Site Admin**: Multi-site management and reporting
- **Supervisor**: Single site data entry only

### Audit Trail
- All significant actions are logged
- User identification and timestamps
- Old and new values for updates
- IP address and user agent tracking

## 🚀 Development Workflow

### Adding New Features

#### Backend
1. Create/update database models in `/models`
2. Create Pydantic schemas in `/schemas`
3. Implement API endpoints in `/api/api_v1/endpoints`
4. Add business logic in `/services` if needed
5. Create database migration with Alembic
6. Add tests in `/tests`

#### Frontend
1. Add TypeScript types in `/types`
2. Create API service functions in `/services`
3. Implement UI components in `/components`
4. Create page components in `/pages`
5. Add routing in `App.tsx`
6. Update navigation in `Layout/Sidebar.tsx`

### Testing Strategy
- **Backend**: Unit tests with pytest, integration tests for APIs
- **Frontend**: Component tests with Jest, integration tests
- **E2E**: Critical user flows with automated testing

## 📦 Deployment Structure

### Development
- Local PostgreSQL database
- Backend on `http://localhost:8000`
- Frontend on `http://localhost:3000`

### Production
- Containerized deployment (Docker recommended)
- Reverse proxy (Nginx) for backend
- Static file serving for frontend
- SSL/TLS encryption
- Database backups and monitoring

---

This structure is designed for scalability, maintainability, and security. Each component has a clear responsibility and the separation of concerns allows for independent development and testing of different parts of the system.