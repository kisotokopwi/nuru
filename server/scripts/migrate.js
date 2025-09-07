const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nuru_worker_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    
    // Create initial system settings
    await createInitialSettings();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function createInitialSettings() {
  try {
    const settings = [
      {
        key: 'currency',
        value: { code: 'TZS', symbol: 'TSh', decimal_places: 0 },
        description: 'Default currency settings for the system'
      },
      {
        key: 'invoice_settings',
        value: {
          company_name: 'Nuru Company',
          company_address: 'Dar es Salaam, Tanzania',
          company_phone: '+255 XXX XXX XXX',
          company_email: 'info@nurucompany.com',
          default_terms: 'Payment due within 30 days'
        },
        description: 'Default invoice settings'
      },
      {
        key: 'system_settings',
        value: {
          allow_same_day_corrections: true,
          max_corrections_per_day: 10,
          auto_lock_records_after_days: 1,
          require_correction_reason: true
        },
        description: 'System behavior settings'
      }
    ];

    for (const setting of settings) {
      await pool.query(
        'INSERT INTO system_settings (setting_key, setting_value, description) VALUES ($1, $2, $3) ON CONFLICT (setting_key) DO NOTHING',
        [setting.key, JSON.stringify(setting.value), setting.description]
      );
    }
    
    console.log('✅ Initial system settings created!');
  } catch (error) {
    console.error('❌ Failed to create initial settings:', error.message);
  }
}

runMigration();