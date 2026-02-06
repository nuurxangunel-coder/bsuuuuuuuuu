require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  try {
    console.log('Connecting to database...');
    
    const sql = fs.readFileSync('./schema.sql', 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Database schema created successfully!');
    
    // Hash super admin password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('majorursa618', 10);
    
    // Update super admin password
    await pool.query(
      'UPDATE admins SET password = $1 WHERE username = $2',
      [hashedPassword, '618ursamajor618']
    );
    
    console.log('✅ Super admin password updated!');
    console.log('Super admin credentials:');
    console.log('Username: 618ursamajor618');
    console.log('Password: majorursa618');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup error:', error);
    process.exit(1);
  }
}

setupDatabase();
