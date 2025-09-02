import request from 'supertest';
import app from '../../server';
import { pool } from '../../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../../config/database');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('API Integration Tests', () => {
  let mockQuery: jest.Mock;
  let mockClient: any;

  beforeAll(() => {
    mockQuery = jest.fn();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    (pool.query as jest.Mock) = mockQuery;
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        github_username: 'testgithub'
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ // INSERT user
          rows: [{
            id: 1,
            username: userData.username,
            email: userData.email,
            created_at: new Date()
          }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe(userData.username);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'test' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockQuery.mockResolvedValue({
        rows: [{
          id: 1,
          username: 'testuser',
          email: credentials.email,
          password_hash: 'hashedpassword'
        }]
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(credentials.email);
    });

    it('should return 401 for invalid credentials', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrong' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Protected Routes', () => {
    const mockToken = 'Bearer mock-token';
    const mockUserId = 1;

    beforeEach(() => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
      mockQuery.mockResolvedValue({
        rows: [{
          id: mockUserId,
          username: 'testuser',
          email: 'test@example.com'
        }]
      });
    });

    describe('GET /api/auth/profile', () => {
      it('should return user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', mockToken)
          .expect(200);

        expect(response.body.username).toBe('testuser');
      });

      it('should return 401 without token', async () => {
        await request(app)
          .get('/api/auth/profile')
          .expect(401);
      });
    });

    describe('GET /api/activities', () => {
      it('should return user activities', async () => {
        mockQuery.mockResolvedValue({
          rows: [
            {
              id: 1,
              activity_type: 'bug_fixed',
              points_earned: 10,
              activity_date: new Date()
            }
          ]
        });

        const response = await request(app)
          .get('/api/activities')
          .set('Authorization', mockToken)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('GET /api/badges', () => {
      it('should return user badges', async () => {
        mockQuery.mockResolvedValue({
          rows: [
            {
              id: 1,
              name: 'Bug Squasher',
              points: 100
            }
          ]
        });

        const response = await request(app)
          .get('/api/badges')
          .set('Authorization', mockToken)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('GET /api/badges/progress', () => {
      it('should return badge progress', async () => {
        mockClient.query
          .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // bugs_fixed
          .mockResolvedValueOnce({ rows: [{ count: '8' }] }) // prs_reviewed
          .mockResolvedValueOnce({ rows: [{ count: '30' }] }) // commits
          .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // prs_merged
          .mockResolvedValueOnce({ rows: [] }) // streak
          .mockResolvedValueOnce({ // all badges
            rows: [{
              id: 1,
              name: 'Bug Squasher',
              criteria: { bugs_fixed: 10 },
              points: 100
            }]
          })
          .mockResolvedValueOnce({ rows: [] }); // user badges

        const response = await request(app)
          .get('/api/badges/progress')
          .set('Authorization', mockToken)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0]).toHaveProperty('progress');
      });
    });

    describe('GET /api/activities/stats', () => {
      it('should return user statistics', async () => {
        mockClient.query
          .mockResolvedValueOnce({ rows: [{ total: '150' }] }) // total points
          .mockResolvedValueOnce({ // activity counts
            rows: [
              { activity_type: 'bug_fixed', count: '10', points: '100' }
            ]
          })
          .mockResolvedValueOnce({ rows: [] }) // streaks
          .mockResolvedValueOnce({ rows: [{ count: '3' }] }); // badges count

        const response = await request(app)
          .get('/api/activities/stats')
          .set('Authorization', mockToken)
          .expect(200);

        expect(response.body).toHaveProperty('total_points');
        expect(response.body).toHaveProperty('badges_earned');
        expect(response.body).toHaveProperty('activity_breakdown');
      });
    });

    describe('POST /api/activities/sync', () => {
      it('should sync activities', async () => {
        // Mock getUserById for auth middleware
        mockQuery.mockResolvedValue({ 
          rows: [{ 
            id: 1, 
            username: 'testuser', 
            email: 'test@example.com',
            github_username: 'testgithub',
            jira_account_id: 'testjira'
          }] 
        });
        
        // Mock activity service operations
        mockClient.query
          .mockResolvedValueOnce({ rows: [{ 
            id: 1, 
            username: 'testuser', 
            email: 'test@example.com',
            github_username: 'testgithub',
            jira_account_id: 'testjira'
          }] }) // Get user details
          .mockResolvedValueOnce({ rows: [] }) // Jira activities
          .mockResolvedValueOnce({ rows: [] }) // GitHub activities
          .mockResolvedValueOnce(undefined) // BEGIN for streaks
          .mockResolvedValueOnce({ rows: [] }) // Get activity dates
          .mockResolvedValueOnce(undefined) // COMMIT for streaks
          .mockResolvedValueOnce(undefined) // BEGIN for badges
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // bugs_fixed
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // prs_reviewed
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // commits
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // prs_merged
          .mockResolvedValueOnce({ rows: [] }) // streak
          .mockResolvedValueOnce({ rows: [] }) // all badges
          .mockResolvedValueOnce({ rows: [] }) // user badges
          .mockResolvedValueOnce(undefined); // COMMIT for badges

        const response = await request(app)
          .post('/api/activities/sync')
          .set('Authorization', mockToken)
          .expect(200);

        expect(response.body).toHaveProperty('message');
      });
    });
  });
});