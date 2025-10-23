import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

// Load environment variables from parent directory's .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Database connection configuration
const config = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'swaddle',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
  max: 10, // Maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  // Initialize connection pool
  async connect() {
    try {
      this.pool = new Pool(config);

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.error('✅ Database connected successfully');

      // Handle errors
      this.pool.on('error', (err) => {
        console.error('💥 Unexpected database error:', err);
        this.isConnected = false;
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  // Execute a query
  async query(text, params = []) {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('💥 Database query error:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  // Close all connections
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.error('🔌 Database connections closed');
    }
  }
}

// Export singleton instance
export const db = new DatabaseConnection();
