import { StreakService } from '../../services/streakService';
import { pool } from '../../config/database';

jest.mock('../../config/database');

describe('StreakService', () => {
  let streakService: StreakService;
  let mockClient: any;

  beforeEach(() => {
    streakService = new StreakService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserStreaks', () => {
    it('should create new streak record for first-time user', async () => {
      const userId = 1;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Get activity dates
          rows: [
            { activity_date: today },
            { activity_date: yesterday }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }) // No existing streak
        .mockResolvedValueOnce(undefined) // INSERT streak
        .mockResolvedValueOnce(undefined); // COMMIT

      await streakService.updateUserStreaks(userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_streaks'),
        expect.arrayContaining([userId, 'daily_activity'])
      );
    });

    it('should update existing streak record', async () => {
      const userId = 1;
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Get activity dates
          rows: [
            { activity_date: today },
            { activity_date: yesterday }
          ]
        })
        .mockResolvedValueOnce({ // Existing streak
          rows: [{
            current_streak: 5,
            longest_streak: 10
          }]
        })
        .mockResolvedValueOnce(undefined) // UPDATE streak
        .mockResolvedValueOnce(undefined); // COMMIT

      await streakService.updateUserStreaks(userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_streaks'),
        expect.arrayContaining([expect.any(Number), expect.any(Number), expect.any(String), userId])
      );
    });

    it('should handle no activities gracefully', async () => {
      const userId = 1;

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // No activities
        .mockResolvedValueOnce(undefined); // COMMIT

      await streakService.updateUserStreaks(userId);

      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('calculateConsecutiveDays', () => {
    it('should calculate consecutive days correctly', () => {
      const today = new Date();
      const dates = [];
      
      // Create 5 consecutive days
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Private method test through reflection
      const result = (streakService as any).calculateConsecutiveDays(dates);
      expect(result).toBe(5);
    });

    it('should return 0 for broken streak', () => {
      const today = new Date();
      const oldDate = new Date(today);
      oldDate.setDate(oldDate.getDate() - 3); // 3 days ago

      const dates = [oldDate.toISOString().split('T')[0]];
      
      const result = (streakService as any).calculateConsecutiveDays(dates);
      expect(result).toBe(0);
    });

    it('should handle same day activities', () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const dates = [todayStr, todayStr, todayStr];
      
      const result = (streakService as any).calculateConsecutiveDays(dates);
      expect(result).toBe(1);
    });
  });

  describe('getUserStreaks', () => {
    it('should return user streaks', async () => {
      const userId = 1;
      const mockStreaks = [
        {
          streak_type: 'daily_activity',
          current_streak: 7,
          longest_streak: 15
        }
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockStreaks });

      const result = await streakService.getUserStreaks(userId);

      expect(result).toEqual(mockStreaks);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM user_streaks WHERE user_id = $1',
        [userId]
      );
    });
  });
});