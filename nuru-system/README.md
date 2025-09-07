# Nuru Company - Enhanced Worker Supervision & Invoice Management System

## Project Overview

The Nuru Worker Management System is a comprehensive solution designed to prevent invoice mismatches and fraud by supervisors, ensure transparency between Nuru Company and client companies, and manage daily record keeping, invoice generation, and payment tracking with complete audit trails.

## 🎯 Key Features

### Core Functionality
- **Fraud Prevention**: Prevents supervisors from manipulating invoices given to clients
- **Invoice Synchronization**: Ensures client and Nuru invoices are identical in core data
- **Payment Transparency**: Tracks daily worker payments with clear audit trails
- **Administrative Control**: Comprehensive dashboard with flexible search and reporting
- **Site Management**: Create sites, define worker types/rates, and assign supervisors
- **Complete Traceability**: Full transparency and fraud prevention for daily work records

### User Roles
- **Super Admin**: Complete system access and configuration
- **Site Admin**: Site-specific management and comprehensive reporting
- **Supervisor**: Daily data entry for assigned site only

### Advanced Features
- **Same-Day Corrections**: Unlimited corrections allowed on the same day with audit trail
- **Dual Invoice Generation**: Separate client and internal Nuru invoices
- **Real-time Dashboard**: Performance metrics and alerts
- **Comprehensive Reporting**: Daily, weekly, monthly analytics with PDF/Excel export
- **Audit Logging**: Complete activity tracking for fraud prevention

## 🏗️ Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **PostgreSQL**: Robust relational database for data storage
- **SQLAlchemy**: Python SQL toolkit and ORM
- **Alembic**: Database migration tool
- **Pydantic**: Data validation using Python type annotations
- **JWT**: Secure authentication and authorization
- **ReportLab/WeasyPrint**: PDF generation for invoices and reports

### Frontend
- **React**: Modern JavaScript library for building user interfaces
- **TypeScript**: Typed superset of JavaScript for better development experience
- **Material-UI**: React UI framework for professional design
- **React Router**: Declarative routing for React applications
- **Axios**: Promise-based HTTP client for API communication
- **Recharts**: Composable charting library for React

## 📋 Prerequisites

Before setting up the system, ensure you have the following installed:

- **Python 3.8+**: Backend development
- **Node.js 16+**: Frontend development
- **PostgreSQL 12+**: Database server
- **Git**: Version control

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd nuru-system
```

### 2. Run the Setup Script
```bash
./scripts/setup.sh
```

### 3. Configure Environment Variables

#### Backend Configuration
Edit `backend/.env`:
```env
DATABASE_URL=postgresql://nuru_user:nuru_password@localhost:5432/nuru_db
SECRET_KEY=your-super-secret-key-change-this-in-production
COMPANY_NAME=Nuru Company
COMPANY_ADDRESS=Dar es Salaam, Tanzania
COMPANY_PHONE=+255-XXX-XXXXXX
COMPANY_EMAIL=info@nurucompany.co.tz
```

#### Frontend Configuration
The frontend environment is already configured in `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:8000/api/v1
```

### 4. Database Setup

Create the PostgreSQL database:
```bash
createdb nuru_db
```

Run database migrations:
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

### 5. Create Super Admin User
```bash
cd backend
python create_admin.py
```

Follow the prompts to create your super admin account.

### 6. Start the Application

#### Start Backend (Terminal 1)
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

#### Start Frontend (Terminal 2)
```bash
cd frontend
npm start
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📊 System Architecture

### Database Schema
The system uses a well-structured relational database with the following key entities:

- **Users**: System users with role-based access
- **Clients**: Client companies (GSM, etc.)
- **Projects**: Client projects
- **Sites**: Work locations under projects
- **Worker Types**: Configurable worker categories with rates
- **Daily Records**: Daily work and payment records
- **Invoices**: Dual invoice system (client & internal)
- **Audit Logs**: Complete activity tracking

### API Architecture
- RESTful API design with FastAPI
- Role-based authentication and authorization
- Comprehensive error handling
- Automatic API documentation with Swagger/OpenAPI
- Request/response validation with Pydantic

### Frontend Architecture
- Component-based React architecture
- Context API for state management
- Material-UI for consistent design
- Responsive design for mobile and desktop
- Protected routes based on user roles

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Different permissions for different user roles
- **Audit Logging**: Complete activity tracking
- **Data Validation**: Input validation on both frontend and backend
- **SQL Injection Protection**: ORM-based database queries
- **CORS Configuration**: Secure cross-origin resource sharing

## 📈 Key Workflows

### Daily Record Entry (Supervisor)
1. Supervisor logs in and selects their assigned site
2. Enters daily worker counts by type
3. Records actual payments made to workers
4. Adds production metrics and notes
5. System automatically locks record after the day ends

### Invoice Generation (Admin)
1. Admin reviews daily records for a site
2. System generates dual invoices simultaneously:
   - **Client Invoice**: Basic information (worker counts, production)
   - **Nuru Invoice**: Detailed information (including payment details)
3. Both invoices share the same core data to prevent fraud
4. PDFs are generated and stored for records

### Fraud Prevention
- Records cannot be modified after the day ends
- All corrections are logged with reasons
- Dual invoice system ensures consistency
- Complete audit trail for all actions

## 📋 Development Guidelines

### Backend Development
- Follow FastAPI best practices
- Use Pydantic models for request/response validation
- Implement proper error handling
- Add audit logging for all important actions
- Write unit tests for critical functionality

### Frontend Development
- Use TypeScript for type safety
- Follow Material-UI design guidelines
- Implement proper error handling and loading states
- Use React hooks and context for state management
- Ensure responsive design

### Database Management
- Use Alembic for all database migrations
- Follow naming conventions for tables and columns
- Implement proper foreign key relationships
- Add appropriate indexes for performance

## 🧪 Testing

### Backend Testing
```bash
cd backend
source venv/bin/activate
pytest
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 📦 Deployment

### Production Environment Setup
1. Set up PostgreSQL database server
2. Configure environment variables for production
3. Set up reverse proxy (Nginx) for the backend
4. Build and deploy frontend static files
5. Set up SSL certificates
6. Configure backup and monitoring

### Docker Deployment (Optional)
Docker configuration files can be added for containerized deployment.

## 🔧 Maintenance

### Regular Tasks
- Monitor audit logs for suspicious activity
- Review system performance metrics
- Update dependencies regularly
- Backup database regularly
- Monitor disk space and system resources

### Database Maintenance
- Regular backups
- Monitor query performance
- Update statistics
- Archive old records if needed

## 📞 Support

For technical support or questions about the system:

- **Email**: technical-support@nurucompany.co.tz
- **Documentation**: See the `/docs` folder for detailed documentation
- **API Documentation**: Available at `/docs` endpoint when running the backend

## 📄 License

This project is proprietary software developed for Nuru Company. All rights reserved.

## 🤝 Contributing

This is a private project for Nuru Company. For internal development guidelines, please refer to the development team documentation.

---

**Note**: This system was developed using AI-powered development (Claude AI) for rapid deployment and cost-effective implementation while maintaining high code quality and security standards.