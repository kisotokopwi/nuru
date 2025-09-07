const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nuru_management'
});

const seedData = async () => {
  try {
    console.log('Seeding database with initial data...');

    // Create Super Admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const superAdminResult = await pool.query(`
      INSERT INTO users (username, email, password_hash, role, full_name, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `, ['admin', 'admin@nuru.com', hashedPassword, 'super_admin', 'System Administrator', '+255123456789']);

    const superAdminId = superAdminResult.rows[0]?.id;

    // Create sample Site Admin
    const siteAdminResult = await pool.query(`
      INSERT INTO users (username, email, password_hash, role, full_name, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `, ['siteadmin', 'siteadmin@nuru.com', hashedPassword, 'site_admin', 'Site Administrator', '+255123456790']);

    const siteAdminId = siteAdminResult.rows[0]?.id;

    // Create sample Supervisor
    const supervisorResult = await pool.query(`
      INSERT INTO users (username, email, password_hash, role, full_name, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `, ['supervisor1', 'supervisor1@nuru.com', hashedPassword, 'supervisor', 'John Supervisor', '+255123456791']);

    const supervisorId = supervisorResult.rows[0]?.id;

    // Create sample project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, client_company, description, invoice_template, created_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      'GSM Mining Project',
      'GSM Company Ltd',
      'Mining operations and site management for GSM Company',
      JSON.stringify({
        header: 'GSM Company Ltd - Daily Work Report',
        footer: 'Thank you for your business',
        includeWorkerNames: false
      }),
      superAdminId
    ]);

    const projectId = projectResult.rows[0]?.id;

    // Create sample site
    const siteResult = await pool.query(`
      INSERT INTO sites (project_id, name, location, description, client_company, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      projectId,
      'GSM Site A - Main Operations',
      'Dar es Salaam, Tanzania',
      'Main mining operations site for GSM Company',
      'GSM Company Ltd',
      superAdminId
    ]);

    const siteId = siteResult.rows[0]?.id;

    // Create worker types for the site
    await pool.query(`
      INSERT INTO worker_types (site_id, name, daily_rate, description, minimum_task_requirement)
      VALUES 
        ($1, $2, $3, $4, $5),
        ($1, $6, $7, $8, $9),
        ($1, $10, $11, $12, $13)
      ON CONFLICT (site_id, name) DO NOTHING
    `, [
      siteId, 'Skilled Worker', 15000.00, 'Experienced mining workers', 'Complete assigned mining tasks',
      siteId, 'Cleaning Worker', 10000.00, 'Site cleaning and maintenance workers', 'Complete site cleaning duties',
      siteId, 'Security Guard', 12000.00, 'Site security personnel', 'Complete security shift'
    ]);

    // Assign supervisor to site
    await pool.query(`
      INSERT INTO site_supervisors (site_id, supervisor_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (site_id) DO NOTHING
    `, [siteId, supervisorId, superAdminId]);

    // Create sample daily record
    const today = new Date().toISOString().split('T')[0];
    await pool.query(`
      INSERT INTO daily_records (site_id, supervisor_id, record_date, worker_counts, production_data, payments_made, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (site_id, record_date) DO NOTHING
    `, [
      siteId,
      supervisorId,
      today,
      JSON.stringify({ '1': 5, '2': 3, '3': 2 }), // 5 skilled, 3 cleaning, 2 security
      JSON.stringify({ tons_produced: 25.5, task_completion: 'All tasks completed successfully' }),
      JSON.stringify({ '1': 75000, '2': 30000, '3': 24000 }), // Total payments
      'Regular daily operations completed without issues'
    ]);

    console.log('Database seeded successfully!');
    console.log('Default credentials:');
    console.log('Super Admin: admin / admin123');
    console.log('Site Admin: siteadmin / admin123');
    console.log('Supervisor: supervisor1 / admin123');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

const runSeed = async () => {
  try {
    await seedData();
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runSeed();