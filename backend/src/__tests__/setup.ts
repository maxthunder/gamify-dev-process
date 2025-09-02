// Prevent the server from starting during tests
process.env.NODE_ENV = 'test';

// Mock database connection
jest.mock('../config/database', () => ({
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    }),
    query: jest.fn(),
    end: jest.fn()
  },
  testConnection: jest.fn().mockResolvedValue(true)
}));