import { AuthService } from '../../services/authService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockClient: any;

  beforeEach(() => {
    authService = new AuthService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'password123',
        github_username: 'testgithub',
        jira_account_id: 'jira123'
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ // INSERT user
          rows: [{
            id: 1,
            username: userData.username,
            email: userData.email,
            github_username: userData.github_username,
            jira_account_id: userData.jira_account_id,
            created_at: new Date()
          }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      const result = await authService.register(userData);

      expect(result.user.username).toBe(userData.username);
      expect(result.user.email).toBe(userData.email);
      expect(result.token).toBe('mock-token');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        username: 'existinguser',
        email: 'existing@example.com',
        password_hash: 'password123'
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // User exists
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(authService.register(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: email,
        password_hash: 'hashedpassword'
      };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      const result = await authService.login(email, password);

      expect(result.user.email).toBe(email);
      expect(result.token).toBe('mock-token');
      expect(result.user.password_hash).toBeUndefined();
    });

    it('should throw error with invalid credentials', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(authService.login('wrong@example.com', 'password')).rejects.toThrow('Invalid credentials');
    });

    it('should throw error with wrong password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const mockDecoded = { userId: 1 };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      const result = authService.verifyToken('valid-token');
      
      expect(result).toEqual(mockDecoded);
    });

    it('should throw error for invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const result = await authService.getUserById(1);
      
      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await authService.getUserById(999);
      
      expect(result).toBeNull();
    });
  });
});