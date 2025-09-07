const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nuru_worker_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const superAdminResult = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['admin@nurucompany.com', hashedPassword, 'Super', 'Admin', 'super_admin', '+255 123 456 789']
    );
    const superAdminId = superAdminResult.rows[0].id;
    
    // Create sample company (GSM)
    const companyResult = await pool.query(
      'INSERT INTO companies (name, contact_person, email, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['GSM Company', 'John Mwalimu', 'contact@gsm.com', '+255 987 654 321', 'Dar es Salaam, Tanzania']
    );
    const companyId = companyResult.rows[0].id;
    
    // Create sample project
    const projectResult = await pool.query(
      'INSERT INTO projects (name, description, company_id, start_date, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['GSM Mining Project', 'Large scale mining operation for GSM Company', companyId, new Date(), superAdminId]
    );
    const projectId = projectResult.rows[0].id;
    
    // Create sample sites
    const site1Result = await pool.query(
      'INSERT INTO sites (name, project_id, location, description, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Site A - Main Quarry', projectId, 'Morogoro Region', 'Primary mining site with heavy machinery', superAdminId]
    );
    const site1Id = site1Result.rows[0].id;
    
    const site2Result = await pool.query(
      'INSERT INTO sites (name, project_id, location, description, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Site B - Processing Plant', projectId, 'Morogoro Region', 'Material processing and cleaning facility', superAdminId]
    );
    const site2Id = site2Result.rows[0].id;
    
    // Create worker types for Site A
    await pool.query(
      'INSERT INTO worker_types (name, site_id, daily_rate, description, minimum_tasks) VALUES ($1, $2, $3, $4, $5)',
      ['Skilled Worker', site1Id, 15000, 'Experienced workers with specialized skills', 'Operate machinery, supervise tasks']
    );
    
    await pool.query(
      'INSERT INTO worker_types (name, site_id, daily_rate, description, minimum_tasks) VALUES ($1, $2, $3, $4, $5)',
      ['General Worker', site1Id, 10000, 'General labor workers', 'Manual labor, material handling']
    );
    
    await pool.query(
      'INSERT INTO worker_types (name, site_id, daily_rate, description, minimum_tasks) VALUES ($1, $2, $3, $4, $5)',
      ['Security Guard', site1Id, 12000, 'Site security personnel', 'Patrol site, monitor access']
    );
    
    // Create worker types for Site B
    await pool.query(
      'INSERT INTO worker_types (name, site_id, daily_rate, description, minimum_tasks) VALUES ($1, $2, $3, $4, $5)',
      ['Cleaning Worker', site2Id, 10000, 'Material cleaning and preparation', 'Clean materials, maintain equipment']
    );
    
    await pool.query(
      'INSERT INTO worker_types (name, site_id, daily_rate, description, minimum_tasks) VALUES ($1, $2, $3, $4, $5)',
      ['Quality Controller', site2Id, 18000, 'Quality assurance specialist', 'Inspect materials, maintain standards']
    );
    
    // Create sample supervisor
    const supervisorPassword = await bcrypt.hash('supervisor123', 12);
    const supervisorResult = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['supervisor@nurucompany.com', supervisorPassword, 'Ahmed', 'Hassan', 'supervisor', '+255 111 222 333']
    );
    const supervisorId = supervisorResult.rows[0].id;
    
    // Assign supervisor to Site A
    await pool.query(
      'UPDATE sites SET assigned_supervisor_id = $1 WHERE id = $2',
      [supervisorId, site1Id]
    );
    
    // Create sample site admin
    const siteAdminPassword = await bcrypt.hash('admin123', 12);
    const siteAdminResult = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['siteadmin@nurucompany.com', siteAdminPassword, 'Fatma', 'Juma', 'site_admin', '+255 444 555 666']
    );
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Sample Data Created:');
    console.log('- Super Admin: admin@nurucompany.com / admin123');
    console.log('- Site Admin: siteadmin@nurucompany.com / admin123');
    console.log('- Supervisor: supervisor@nurucompany.com / supervisor123');
    console.log('- Company: GSM Company');
    console.log('- Project: GSM Mining Project');
    console.log('- Sites: Site A (Main Quarry), Site B (Processing Plant)');
    console.log('- Worker Types: Skilled Worker (15,000 TZS), General Worker (10,000 TZS), etc.');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();