import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { User } from '../types';

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-this';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  async register(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<{ user: User; token: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists with this email or username');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password_hash!, saltRounds);

      // Create user
      const result = await client.query(
        `INSERT INTO users (username, email, password_hash, github_username, jira_account_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, github_username, jira_account_id, created_at`,
        [userData.username, userData.email, hashedPassword, userData.github_username, userData.jira_account_id]
      );

      const user = result.rows[0];
      delete user.password_hash;

      // Generate token
      const token = this.generateToken(user.id);

      await client.query('COMMIT');
      
      return { user, token };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    delete user.password_hash;
    const token = this.generateToken(user.id);

    return { user, token };
  }

  generateToken(userId: number): string {
    return jwt.sign(
      { userId },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
    );
  }

  verifyToken(token: string): { userId: number } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: number };
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async getUserById(userId: number): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, username, email, github_username, jira_account_id, created_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0] || null;
  }
}