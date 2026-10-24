import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = process.env.DB_FILE || 'portal.sqlite';
const dbPath = path.isAbsolute(dbFile) ? dbFile : path.resolve(__dirname, '..', dbFile);

let dbInstance = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enforce foreign key constraints in SQLite
    await dbInstance.run('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

export default {
  getDb
};
