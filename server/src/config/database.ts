import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export interface IDatabaseClient {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

let dbClient: IDatabaseClient | null = null;

class PGliteAdapter implements IDatabaseClient {
  private pglite: PGlite;

  constructor(pglite: PGlite) {
    this.pglite = pglite;
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const res = await this.pglite.query(text, params);
    return {
      rows: (res.rows as T[]) || [],
      rowCount: res.affectedRows ?? res.rows?.length ?? 0,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  async close(): Promise<void> {
    await this.pglite.close();
  }
}

class PgPoolAdapter implements IDatabaseClient {
  private pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const res = await this.pool.query(text, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? 0,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export async function getDatabase(): Promise<IDatabaseClient> {
  if (dbClient) {
    return dbClient;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    try {
      console.log('Connecting to PostgreSQL using DATABASE_URL...');
      const pool = new pg.Pool({ connectionString: databaseUrl });
      await pool.query('SELECT 1');
      console.log('Connected to PostgreSQL database server.');
      dbClient = new PgPoolAdapter(pool);
      return dbClient;
    } catch (err) {
      console.warn('PostgreSQL connection error, falling back to embedded PostgreSQL (PGlite):', err);
    }
  }

  // Use embedded PostgreSQL engine (PGlite) with persistence directory
  const dataDir = path.resolve(process.cwd(), 'data', 'pgdata');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    console.log(`Initializing Embedded PostgreSQL database in ${dataDir}...`);
    const pglite = new PGlite(dataDir);
    await pglite.waitReady;
    dbClient = new PGliteAdapter(pglite);
    console.log('Embedded PostgreSQL engine initialized with persistence.');
    return dbClient;
  } catch (err) {
    console.warn('Persistent PGlite init failed, initializing in-memory PGlite:', err);
    const pglite = new PGlite();
    await pglite.waitReady;
    dbClient = new PGliteAdapter(pglite);
    console.log('In-memory Embedded PostgreSQL engine initialized.');
    return dbClient;
  }
}

export async function initDatabase(): Promise<void> {
  const db = await getDatabase();

  const schemaPath = path.resolve(__dirname, '../models/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await db.exec(schemaSql);
    console.log('Database tables & schema initialized successfully.');
  }
}
