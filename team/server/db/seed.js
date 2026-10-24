import bcrypt from 'bcryptjs';
import { getDb } from '../config/database.js';
import { initializeDatabase } from './initDb.js';

export async function seedHOD() {
  await initializeDatabase();
  const db = await getDb();

  const existingHOD = await db.get('SELECT * FROM users WHERE role = ?', ['hod']);
  if (existingHOD) {
    console.log(`ℹ️ HOD account already exists: ${existingHOD.email}`);
    return existingHOD;
  }

  const defaultPassword = process.env.HOD_PASSWORD || 'HodPass@2026';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  const result = await db.run(
    `INSERT INTO users (role, name, email, password_hash, avatar)
     VALUES (?, ?, ?, ?, ?)`,
    [
      'hod',
      'Dr. Robert Vance (HOD)',
      'hod.cs@college.edu',
      passwordHash,
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    ]
  );

  console.log('✅ Exactly 1 HOD account created successfully:');
  console.log(`   Email: hod.cs@college.edu`);
  console.log(`   Password: ${defaultPassword}`);
  console.log(`   Role: hod (ID: ${result.lastID})`);

  return { id: result.lastID, email: 'hod.cs@college.edu', role: 'hod' };
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedHOD()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error seeding HOD account:', err);
      process.exit(1);
    });
}
