# Nuru Company - Enhanced Worker Supervision & Invoice Management System

A comprehensive system for managing worker supervision, daily records, and invoice generation with fraud prevention and complete audit trails.

## Features

### Core Functionality
- **Role-based Authentication**: Super Admin, Site Admin, and Supervisor roles
- **Site & Project Management**: Create and manage projects, sites, and worker types
- **Daily Data Entry**: Supervisors can record daily work with worker counts and payments
- **Fraud Prevention**: Same-day corrections only, unlimited corrections with audit trail
- **Dual Invoice Generation**: Client invoices (summary) and Nuru invoices (detailed)
- **Comprehensive Reporting**: Advanced analytics, search, and export capabilities

### Security & Audit
- **Complete Audit Trail**: All actions logged with timestamps and user information
- **Immutable Records**: Historical data cannot be altered after day passes
- **Supervisor Performance Tracking**: Monitor correction patterns and performance
- **Role-based Access Control**: Granular permissions based on user roles

### Technology Stack
- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: React 18, Ant Design, React Query
- **PDF Generation**: Puppeteer for high-quality invoice generation
- **Authentication**: JWT-based with bcrypt password hashing
- **Currency**: TZS (Tanzanian Shillings) formatting

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nuru-worker-management
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb nuru_worker_management
   
   # Copy environment file
   cp .env.example .env
   
   # Edit .env with your database credentials
   nano .env
   ```

4. **Run database migrations**
   ```bash
   cd server
   npm run migrate
   npm run seed
   ```

5. **Start the application**
   ```bash
   # From project root
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Default Login Credentials

After running the seed script, you can login with:

- **Super Admin**: admin@nurucompany.com / admin123
- **Site Admin**: siteadmin@nurucompany.com / admin123  
- **Supervisor**: supervisor@nurucompany.com / supervisor123

## Project Structure

```
nuru-worker-management/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # CSS and styling
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration files
│   ├── database/          # Database schema and migrations
│   └── scripts/           # Database scripts
└── docs/                  # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Companies
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company
- `GET /api/companies/:id` - Get company details
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Sites
- `GET /api/sites` - List sites
- `POST /api/sites` - Create site
- `GET /api/sites/:id` - Get site details
- `PUT /api/sites/:id` - Update site
- `POST /api/sites/:id/assign-supervisor` - Assign supervisor
- `DELETE /api/sites/:id/remove-supervisor` - Remove supervisor

### Worker Types
- `GET /api/worker-types/site/:siteId` - Get worker types for site
- `POST /api/worker-types` - Create worker type
- `PUT /api/worker-types/:id` - Update worker type
- `DELETE /api/worker-types/:id` - Delete worker type

### Daily Records
- `GET /api/daily-records/site/:siteId` - Get daily records for site
- `POST /api/daily-records` - Create daily record (Supervisor only)
- `PUT /api/daily-records/:id` - Update daily record (Same day only)
- `GET /api/daily-records/summary/dashboard` - Get dashboard summary

### Invoices
- `POST /api/invoices/generate/:dailyRecordId` - Generate invoices
- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id` - Get invoice details
- `PUT /api/invoices/:id/status` - Update invoice status
- `GET /api/invoices/:id/download` - Download invoice PDF

### Reports
- `GET /api/reports/dashboard` - Get dashboard data
- `GET /api/reports/analytics` - Get detailed analytics
- `GET /api/reports/supervisor-performance` - Get supervisor performance
- `GET /api/reports/export` - Export data (CSV/JSON)

## Key Features Explained

### Fraud Prevention
- **Same-day corrections only**: Records become immutable after the day passes
- **Unlimited same-day corrections**: Supervisors can correct mistakes with reason tracking
- **Audit trail**: All actions are logged with timestamps and user information
- **Performance monitoring**: System tracks excessive corrections per supervisor

### Dual Invoice System
- **Client Invoice**: Contains site info, worker counts, production, and total amount
- **Nuru Invoice**: Contains all client data PLUS detailed payment info and worker names
- **Professional PDFs**: High-quality, branded invoices ready for delivery
- **Template flexibility**: Customizable invoice formats per client

### Advanced Reporting
- **Real-time dashboard**: Current day summary with missing records alerts
- **Flexible filtering**: By date range, company, project, site, or supervisor
- **Analytics**: Time series data, productivity metrics, and performance insights
- **Export capabilities**: CSV and JSON export for external analysis

## Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nuru_worker_management
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# PDF Generation
PDF_OUTPUT_PATH=./pdfs

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Database Management
```bash
# Run migrations
cd server && npm run migrate

# Seed sample data
cd server && npm run seed

# Reset database (careful!)
cd server && npm run migrate && npm run seed
```

## Deployment

### Production Deployment
1. Set `NODE_ENV=production` in environment variables
2. Update database credentials for production
3. Set secure JWT secret
4. Configure CORS for production domain
5. Build frontend: `npm run build`
6. Start server: `npm start`

### Docker Deployment (Optional)
```bash
# Build Docker image
docker build -t nuru-worker-management .

# Run with Docker Compose
docker-compose up -d
```

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- Rate limiting prevents brute force attacks
- Input validation on all endpoints
- SQL injection protection with parameterized queries
- CORS configured for specific origins
- Helmet.js for security headers

## Support

For technical support or questions:
- Email: support@nurucompany.com
- Documentation: See `/docs` folder for detailed guides

## License

This project is proprietary software developed for Nuru Company. All rights reserved.

---

**Built with ❤️ for Nuru Company using AI-powered development**