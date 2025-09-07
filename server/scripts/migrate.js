const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nuru_management'
});

const createTables = async () => {
  try {
    console.log('Creating database tables...');

    // Users table (Super Admin, Site Admin, Supervisor)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'site_admin', 'supervisor')),
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        client_company VARCHAR(100) NOT NULL,
        description TEXT,
        invoice_template JSONB,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(200) NOT NULL,
        description TEXT,
        client_company VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Worker types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_types (
        id SERIAL PRIMARY KEY,
        site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        daily_rate DECIMAL(10,2) NOT NULL,
        description TEXT,
        minimum_task_requirement VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(site_id, name)
      )
    `);

    // Site supervisors table (one supervisor per site at a time)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_supervisors (
        id SERIAL PRIMARY KEY,
        site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
        supervisor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        UNIQUE(site_id) -- Ensures one supervisor per site
      )
    `);

    // Daily records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_records (
        id SERIAL PRIMARY KEY,
        site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
        supervisor_id INTEGER REFERENCES users(id),
        record_date DATE NOT NULL,
        worker_counts JSONB NOT NULL, -- {worker_type_id: count}
        production_data JSONB, -- {tons_produced: number, task_completion: string}
        payments_made JSONB NOT NULL, -- {worker_type_id: amount_paid}
        worker_names JSONB, -- Optional: {worker_type_id: [names]}
        notes TEXT,
        is_locked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(site_id, record_date)
      )
    `);

    // Audit trail table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_trail (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
        old_values JSONB,
        new_values JSONB,
        user_id INTEGER REFERENCES users(id),
        reason VARCHAR(200),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
        record_date DATE NOT NULL,
        invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('client', 'nuru')),
        client_data JSONB NOT NULL,
        nuru_data JSONB, -- Additional data for Nuru invoice
        pdf_path VARCHAR(255),
        generated_by INTEGER REFERENCES users(id),
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Same-day corrections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS same_day_corrections (
        id SERIAL PRIMARY KEY,
        daily_record_id INTEGER REFERENCES daily_records(id) ON DELETE CASCADE,
        correction_reason VARCHAR(100) NOT NULL,
        old_values JSONB NOT NULL,
        new_values JSONB NOT NULL,
        corrected_by INTEGER REFERENCES users(id),
        corrected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_records_site_date ON daily_records(site_id, record_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON audit_trail(table_name, record_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_trail_user_date ON audit_trail(user_id, created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_site_date ON invoices(site_id, record_date)`);

    console.log('Database tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const runMigration = async () => {
  try {
    await createTables();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigration();