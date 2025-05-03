
import mysql from 'mysql2/promise';

// MySQL connection configuration
const config = {
  host: 'localhost',  // Change this to your MySQL host
  user: 'shopiesp_votes',
  password: 'shopiesp_votes',
  database: 'shopiesp_votes',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a connection pool
export const pool = mysql.createPool(config);

// Helper function to execute queries
export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Specialized query for when we want to get the inserted ID
export async function insertQuery<T>(sql: string, params: any[] = []): Promise<{ id: string; affectedRows: number }> {
  try {
    const [result] = await pool.execute(sql, params);
    const insertResult = result as mysql.ResultSetHeader;
    return { 
      id: insertResult.insertId.toString(), 
      affectedRows: insertResult.affectedRows 
    };
  } catch (error) {
    console.error('Database insertion error:', error);
    throw error;
  }
}

