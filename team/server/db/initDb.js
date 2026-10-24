import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(db) {
  try {
    // 1. Check if teams table exists
    const teamsTableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='teams'"
    );

    if (teamsTableExists) {
      const teamCols = (await db.all("PRAGMA table_info(teams)")).map(c => c.name);

      if (!teamCols.includes('leader_id')) {
        await db.run("ALTER TABLE teams ADD COLUMN leader_id INTEGER NULLABLE");
        await db.run("UPDATE teams SET leader_id = created_by WHERE leader_id IS NULL");
      }
      if (!teamCols.includes('project_title')) {
        await db.run("ALTER TABLE teams ADD COLUMN project_title TEXT");
      }
      if (!teamCols.includes('description')) {
        await db.run("ALTER TABLE teams ADD COLUMN description TEXT");
      }
      if (!teamCols.includes('domain')) {
        await db.run("ALTER TABLE teams ADD COLUMN domain TEXT");
      }
      if (!teamCols.includes('technologies')) {
        await db.run("ALTER TABLE teams ADD COLUMN technologies TEXT");
      }
      if (!teamCols.includes('required_skills')) {
        await db.run("ALTER TABLE teams ADD COLUMN required_skills TEXT");
      }
      if (!teamCols.includes('max_members')) {
        await db.run("ALTER TABLE teams ADD COLUMN max_members INTEGER DEFAULT 4");
      }
      if (!teamCols.includes('objectives')) {
        await db.run("ALTER TABLE teams ADD COLUMN objectives TEXT");
      }
      if (!teamCols.includes('target_date')) {
        await db.run("ALTER TABLE teams ADD COLUMN target_date TEXT");
      }
      if (!teamCols.includes('status')) {
        await db.run("ALTER TABLE teams ADD COLUMN status TEXT DEFAULT 'approved'");
      }
      if (!teamCols.includes('hod_remarks')) {
        await db.run("ALTER TABLE teams ADD COLUMN hod_remarks TEXT");
      }
      if (!teamCols.includes('is_accepting_members')) {
        await db.run("ALTER TABLE teams ADD COLUMN is_accepting_members INTEGER DEFAULT 1");
      }

      // Check if faculty_id in teams is NOT NULL. If so, migrate to make it NULLABLE
      const facCol = (await db.all("PRAGMA table_info(teams)")).find(c => c.name === 'faculty_id');
      if (facCol && facCol.notnull === 1) {
        await db.run("PRAGMA foreign_keys = OFF");
        await db.run(`
          CREATE TABLE teams_migrated (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            faculty_id INTEGER NULLABLE,
            leader_id INTEGER NULLABLE,
            created_by INTEGER NOT NULL,
            project_title TEXT,
            description TEXT,
            domain TEXT,
            technologies TEXT,
            required_skills TEXT,
            max_members INTEGER DEFAULT 4,
            objectives TEXT,
            target_date TEXT,
            status TEXT NOT NULL DEFAULT 'approved',
            hod_remarks TEXT,
            is_accepting_members INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await db.run(`
          INSERT INTO teams_migrated (
            id, name, faculty_id, leader_id, created_by, project_title, description, domain,
            technologies, required_skills, max_members, objectives, target_date, status,
            hod_remarks, is_accepting_members, created_at
          )
          SELECT id, name, faculty_id, COALESCE(leader_id, created_by), created_by, project_title,
                 description, domain, technologies, required_skills, COALESCE(max_members, 4),
                 objectives, target_date, COALESCE(status, 'approved'), hod_remarks,
                 COALESCE(is_accepting_members, 1), created_at
          FROM teams
        `);
        await db.run("DROP TABLE teams");
        await db.run("ALTER TABLE teams_migrated RENAME TO teams");
        await db.run("PRAGMA foreign_keys = ON");
      }
    }

    // 2. Check team_members table columns
    const tmExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='team_members'"
    );
    if (tmExists) {
      const tmCols = (await db.all("PRAGMA table_info(team_members)")).map(c => c.name);
      if (!tmCols.includes('role')) {
        await db.run("ALTER TABLE team_members ADD COLUMN role TEXT DEFAULT 'member'");
      }
      if (!tmCols.includes('joined_at')) {
        await db.run("ALTER TABLE team_members ADD COLUMN joined_at DATETIME");
      }
    }

    // 3. Check notifications table
    const notifExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'"
    );
    if (notifExists) {
      const notifCols = (await db.all("PRAGMA table_info(notifications)")).map(c => c.name);
      if (!notifCols.includes('target_user_id')) {
        await db.run("ALTER TABLE notifications ADD COLUMN target_user_id INTEGER NULLABLE");
      }
    }

    // 4. Check chat_groups faculty_id nullable
    const cgExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_groups'"
    );
    if (cgExists) {
      const cgFacCol = (await db.all("PRAGMA table_info(chat_groups)")).find(c => c.name === 'faculty_id');
      if (cgFacCol && cgFacCol.notnull === 1) {
        await db.run("PRAGMA foreign_keys = OFF");
        await db.run(`
          CREATE TABLE chat_groups_migrated (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            team_id INTEGER NULLABLE,
            faculty_id INTEGER NULLABLE,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await db.run(`
          INSERT INTO chat_groups_migrated (id, name, team_id, faculty_id, created_by, created_at)
          SELECT id, name, team_id, faculty_id, created_by, created_at FROM chat_groups
        `);
        await db.run("DROP TABLE chat_groups");
        await db.run("ALTER TABLE chat_groups_migrated RENAME TO chat_groups");
        await db.run("PRAGMA foreign_keys = ON");
      }
    }

    // 5. Ensure team_join_requests exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS team_join_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        decided_at DATETIME NULLABLE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_join_req_team ON team_join_requests(team_id);
      CREATE INDEX IF NOT EXISTS idx_join_req_student ON team_join_requests(student_id);
    `);

    // Backfill any team without domain/tech if it's existing CloudScale
    await db.run(`
      UPDATE teams
      SET project_title = COALESCE(project_title, 'CloudScale: Multi-Tenant Campus Event Platform'),
          domain = COALESCE(domain, 'Cloud Computing'),
          technologies = COALESCE(technologies, 'Node.js, Docker, Kubernetes, Redis, React'),
          required_skills = COALESCE(required_skills, 'Frontend, Backend, DevOps'),
          description = COALESCE(description, 'Scalable microservice architecture for departmental events with automated queuing and telemetry.'),
          objectives = COALESCE(objectives, 'Deliver a fault-tolerant multi-tenant campus platform with sub-100ms response times.'),
          target_date = COALESCE(target_date, '2026-12-15'),
          status = COALESCE(status, 'approved')
      WHERE name = 'CloudScale' AND domain IS NULL
    `);

    // 6. Check student_profiles columns
    const spExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='student_profiles'"
    );
    if (spExists) {
      const spCols = (await db.all("PRAGMA table_info(student_profiles)")).map(c => c.name);
      const colsToAdd = [
        ['username', 'TEXT'],
        ['location', 'TEXT'],
        ['website_url', 'TEXT'],
        ['headline', 'TEXT'],
        ['technical_skills', 'TEXT'],
        ['frameworks', 'TEXT'],
        ['experience_level', "TEXT DEFAULT 'Intermediate'"],
        ['college', "TEXT DEFAULT 'Department of Computer Science & Engineering'"],
        ['education', 'TEXT'],
        ['interests', 'TEXT'],
        ['achievements', 'TEXT'],
        ['availability_status', "TEXT DEFAULT 'available'"]
      ];
      for (const [colName, colType] of colsToAdd) {
        if (!spCols.includes(colName)) {
          await db.run(`ALTER TABLE student_profiles ADD COLUMN ${colName} ${colType}`);
        }
      }
    }

  } catch (err) {
    console.warn('⚠️ Migration warning (non-fatal):', err.message);
  }
}

export async function initializeDatabase() {
  const db = await getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // SQLite exec supports multiple statements
  await db.exec(schemaSql);
  await runMigrations(db);
  console.log('✅ Database schema initialized and migrated successfully.');
}

// If run directly from command line
if (process.argv[1] && process.argv[1].endsWith('initDb.js')) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Failed to initialize database:', err);
      process.exit(1);
    });
}
