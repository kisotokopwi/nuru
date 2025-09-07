# Nuru Company - Enhanced Worker Supervision & Invoice Management System

A comprehensive web-based system designed to prevent invoice mismatches and fraud by supervisors, ensure transparency between Nuru Company and client companies, and manage daily record keeping, invoice generation, and payment tracking with complete audit trails.

## 🚀 Features

### Core System Features

- **Site & Project Management**: Create projects for different clients with custom invoice templates
- **Worker Type Configuration**: Define worker types per site with daily rates
- **Supervisor Assignment**: Assign registered supervisors to specific sites
- **Daily Data Entry**: User-friendly interface for daily work data entry with fraud prevention
- **Dual Invoice Generation**: Client and Nuru invoices with appropriate detail levels
- **Comprehensive Reporting**: Advanced search, filtering, and analytics
- **Complete Audit Trail**: Full transparency and fraud prevention for daily work records

### Fraud Prevention & Security

- **Unlimited Same-Day Corrections**: Supervisors can make corrections on the same day with reason tracking
- **No Next-Day Corrections**: Records become permanently locked after the day passes
- **Supervisor Performance Tracking**: Monitor excessive same-day corrections
- **Complete Audit Trail**: All actions logged with timestamps and user information
- **Role-Based Access Control**: Super Admin, Site Admin, and Supervisor roles

### User Roles

- **Super Admin**: Complete system access and configuration capabilities
- **Site Admin**: Site-specific management and comprehensive reporting
- **Supervisor**: Daily data entry for assigned site only

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** authentication
- **Puppeteer** for PDF generation
- **bcryptjs** for password hashing

### Frontend
- **React 18** with functional components and hooks
- **Ant Design** UI components
- **React Query** for data fetching and caching
- **React Router** for navigation
- **Axios** for API calls

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd nuru-worker-management
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (root, server, and client)
npm run install-all
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb nuru_management

# Run database migrations
cd server
npm run migrate

# Seed initial data
npm run seed
```

### 4. Environment Configuration
Copy the example environment file and configure:
```bash
cp server/.env.example server/.env
```

Update the following variables in `server/.env`:
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: A secure secret key for JWT tokens
- `PORT`: Server port (default: 5000)

### 5. Start the Application
```bash
# Start both server and client in development mode
npm run dev

# Or start them separately:
# Terminal 1 - Server
npm run server

# Terminal 2 - Client
npm run client
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🔐 Default Login Credentials

The system comes with pre-configured demo accounts:

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| Super Admin | `admin` | `admin123` | Full system access |
| Site Admin | `siteadmin` | `admin123` | Site management and reporting |
| Supervisor | `supervisor1` | `admin123` | Daily record entry for assigned sites |

## 📊 System Architecture

### Database Schema
- **Users**: Authentication and role management
- **Projects**: Client project information
- **Sites**: Physical locations under projects
- **Worker Types**: Configurable worker categories with rates
- **Daily Records**: Daily work data with fraud prevention
- **Invoices**: Dual invoice generation (client and internal)
- **Audit Trail**: Complete action logging
- **Same-Day Corrections**: Correction tracking and monitoring

### API Endpoints
- `/api/auth/*` - Authentication and user management
- `/api/projects/*` - Project management
- `/api/sites/*` - Site management
- `/api/worker-types/*` - Worker type configuration
- `/api/supervisors/*` - Supervisor management
- `/api/daily-records/*` - Daily record management
- `/api/invoices/*` - Invoice generation and management
- `/api/reports/*` - Reporting and analytics
- `/api/audit/*` - Audit trail access
- `/api/users/*` - User management (Super Admin only)

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Session management

### Fraud Prevention
- Same-day correction limits
- Record locking after day ends
- Complete audit trail
- Supervisor performance monitoring
- Immutable historical data

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- CORS configuration

## 📈 Reporting & Analytics

### Dashboard Features
- Real-time summary statistics
- Daily, weekly, and monthly views
- Missing entry alerts
- Recent activity tracking

### Advanced Reporting
- Comprehensive data filtering
- Worker type analysis
- Supervisor performance reports
- Correction pattern analysis
- PDF report generation

### Export Capabilities
- Excel data exports
- PDF report generation
- Filtered data exports
- Invoice batch exports

## 🎯 Key Workflows

### Daily Record Entry (Supervisor)
1. Select assigned site
2. Choose record date (today only)
3. Enter worker counts by type
4. System auto-calculates payments
5. Add production data and notes
6. Submit record (can be corrected same day)

### Invoice Generation (Admin)
1. Select daily record
2. Choose invoice type (client or internal)
3. Configure detail level
4. Generate PDF invoices
5. Download or email invoices

### Site Management (Admin)
1. Create project for client
2. Add sites under project
3. Configure worker types and rates
4. Assign supervisors to sites
5. Monitor daily operations

## 🚀 Deployment

### Production Deployment
1. Set `NODE_ENV=production` in environment
2. Configure production database
3. Set secure JWT secret
4. Build client application: `npm run build`
5. Start production server: `npm start`

### Docker Deployment (Optional)
```bash
# Build and run with Docker
docker-compose up -d
```

## 🧪 Testing

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test
```

## 📝 API Documentation

### Authentication
```javascript
// Login
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

// Get profile
GET /api/auth/profile
Authorization: Bearer <token>
```

### Daily Records
```javascript
// Create record
POST /api/daily-records
{
  "site_id": 1,
  "record_date": "2024-01-15",
  "worker_counts": {"1": 5, "2": 3},
  "payments_made": {"1": 75000, "2": 30000},
  "production_data": {"tons_produced": 25.5}
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - Project and site management
  - Daily record entry with fraud prevention
  - Dual invoice generation
  - Comprehensive reporting
  - Complete audit trail

---

**Built with ❤️ for Nuru Company**