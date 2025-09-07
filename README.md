# Nuru Company – Enhanced Worker Supervision & Invoice Management System

A comprehensive full-stack web application designed to prevent invoice mismatches and fraud, ensure transparency between Nuru Company and client companies, and manage daily record keeping, invoice generation, and payment tracking with complete audit trails.

## 🎯 Project Objectives

- **Fraud Prevention**: Prevent supervisors from manipulating invoices given to clients versus those recorded at Nuru
- **Invoice Synchronization**: Ensure client and Nuru invoices are always identical in core data
- **Payment Transparency**: Track daily worker payments with clear audit trails
- **Administrative Control**: Provide comprehensive dashboard with flexible search and reporting capabilities
- **Site Management**: Enable admins to create sites, define worker types/rates, and assign supervisors
- **Operational Simplicity**: Keep the system practical and user-friendly for supervisors and admins
- **Complete Traceability**: Provide full transparency and fraud prevention for daily work records

## 🚀 Key Features

### 🔐 Authentication & Security
- **Role-Based Access Control**: Super Admin, Site Admin, Supervisor roles
- **JWT Authentication**: Secure token-based authentication
- **Fraud Prevention**: Same-day editing restrictions for daily records
- **Audit Logging**: Complete action tracking with timestamps
- **Input Validation**: Comprehensive form validation and SQL injection protection

### 👥 User Management
- **Complete CRUD Operations**: Create, read, update, delete users
- **Role Management**: Assign and manage user roles
- **Profile Management**: User profile editing and password management
- **User Statistics**: Dashboard with user counts and role distribution

### 🏗️ Site & Project Management
- **Site Management**: Create and manage work sites with location details
- **Project Management**: Organize sites under client projects
- **Supervisor Assignment**: Assign supervisors to specific sites
- **Company Integration**: Link sites and projects to client companies

### 👷 Worker Types & Daily Records
- **Worker Type Configuration**: Define worker types with daily rates (TZS)
- **Daily Record Entry**: Simple supervisor interface for daily work data
- **Fraud Prevention**: Records can only be edited on the same day
- **Production Tracking**: Input tons produced or task completion metrics
- **Payment Documentation**: Record actual amounts paid to each worker type

### 📄 Dual Invoice System
- **Client Invoice**: Contains site information, date, worker count, production data
- **Nuru Invoice**: Contains all client data PLUS detailed payment information
- **PDF Generation**: Professional invoice formatting using Puppeteer
- **Invoice Management**: Draft, sent, paid, overdue statuses
- **Download Options**: Separate downloads for client and Nuru invoices

### 📊 Reports & Analytics
- **Comprehensive Dashboard**: Real-time overview statistics
- **Multiple Report Types**: Daily, weekly, monthly reports
- **Interactive Charts**: Bar charts, line charts, pie charts using Recharts
- **Site Performance Analysis**: Compare site productivity and costs
- **Worker Type Analysis**: Cost analysis and distribution
- **Export Functionality**: PDF and Excel export capabilities

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **Ant Design**: Professional UI component library
- **React Query**: Efficient data fetching and caching
- **React Router**: Client-side routing
- **Recharts**: Data visualization and charting
- **Day.js**: Date manipulation and formatting

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **PostgreSQL**: Relational database
- **JWT**: JSON Web Tokens for authentication
- **Winston**: Logging library for audit trails
- **Puppeteer**: PDF generation for invoices
- **Bcrypt**: Password hashing

### Security & Validation
- **Input Validation**: Comprehensive form validation
- **SQL Injection Protection**: Parameterized queries
- **Rate Limiting**: API protection against abuse
- **CORS Configuration**: Secure cross-origin requests
- **Password Security**: Bcrypt hashing with salt

## 📁 Project Structure

```
nuru-company-system/
├── client/                 # React frontend application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   └── package.json       # Frontend dependencies
├── server/                # Node.js backend application
│   ├── routes/           # API route handlers
│   ├── middleware/       # Express middleware
│   ├── config/          # Configuration files
│   ├── database/        # Database schema and migrations
│   ├── utils/           # Utility functions
│   └── package.json     # Backend dependencies
├── setup.sh             # Automated setup script
└── README.md           # Project documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kisotokopwi/nuru.git
   cd nuru
   ```

2. **Run the setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure environment variables**
   ```bash
   # Copy example environment files
   cp .env.example .env
   cp server/.env.example server/.env
   
   # Edit the environment files with your database credentials
   ```

4. **Start the development servers**
   ```bash
   # Start backend server (from root directory)
   cd server && npm run dev
   
   # Start frontend server (from root directory)
   cd client && npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Login Credentials
- **Super Admin**: admin@nuru.com / admin123
- **Site Admin**: siteadmin@nuru.com / admin123
- **Supervisor**: supervisor@nuru.com / admin123

## 📊 Database Schema

The system uses PostgreSQL with the following main entities:

- **users**: User accounts with role-based access
- **companies**: Client companies
- **projects**: Projects under companies
- **sites**: Work sites under projects
- **worker_types**: Worker types with daily rates
- **daily_records**: Daily work records with fraud prevention
- **invoices**: Dual invoice system (client & Nuru)
- **audit_logs**: Complete audit trail
- **supervisor_performance_logs**: Supervisor performance tracking

## 🔒 Security Features

### Fraud Prevention
- **Same-Day Editing Only**: Daily records can only be edited on the day they're created
- **Immutable History**: Past records cannot be modified
- **Audit Trail**: All changes logged with timestamps and reasons
- **Supervisor Performance Tracking**: Monitor excessive corrections

### Authentication & Authorization
- **JWT Tokens**: Secure authentication with expiration
- **Role-Based Access**: Different permissions for different user roles
- **Password Security**: Bcrypt hashing with salt rounds
- **Session Management**: Secure token storage and validation

## 📈 Reporting & Analytics

### Dashboard Features
- **Real-Time Statistics**: Live data updates
- **Interactive Charts**: Multiple chart types for data visualization
- **Export Capabilities**: PDF and Excel export options
- **Advanced Filtering**: Filter by date, site, company, worker type
- **Performance Metrics**: Productivity and cost analysis

### Report Types
- **Daily Reports**: Daily worker counts, payments, and production
- **Weekly Reports**: Weekly summaries and trends
- **Monthly Reports**: Monthly overviews and comparisons
- **Site Performance**: Site-specific analytics
- **Worker Type Analysis**: Cost analysis by worker type

## 🚀 Deployment

### Production Deployment
The system is ready for deployment to:
- **AWS**: EC2, RDS, S3 for scalable deployment
- **Hostinger**: Shared hosting or VPS deployment
- **Docker**: Containerized deployment option

### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=nuru_production
DB_USER=your-db-user
DB_PASSWORD=your-db-password
JWT_SECRET=your-jwt-secret
PORT=5000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 🎉 Acknowledgments

- Built with modern web technologies
- Designed for fraud prevention and transparency
- Optimized for user experience and operational efficiency
- Comprehensive audit trail and reporting capabilities

---

**Nuru Company Enhanced Worker Supervision & Invoice Management System** - Ensuring transparency, preventing fraud, and streamlining operations.