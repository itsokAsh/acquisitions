import { sql } from '../src/config/database.js';

async function fixTimestamps() {
  try {
    console.log('Fixing timestamp defaults...');
    
    // Add defaults to timestamp columns
    await sql`
      ALTER TABLE users 
      ALTER COLUMN created_at SET DEFAULT now(),
      ALTER COLUMN updated_at SET DEFAULT now()
    `;
    
    console.log('✅ Timestamp defaults fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing timestamps:', error);
  }
  process.exit(0);
}

fixTimestamps();
