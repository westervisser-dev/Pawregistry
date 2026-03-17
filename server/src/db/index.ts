import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

// Use transaction mode for the connection pooler (port 6543)
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema, logger: process.env.NODE_ENV !== 'production' });
