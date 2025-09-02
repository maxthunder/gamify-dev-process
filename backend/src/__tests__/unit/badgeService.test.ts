import { BadgeService } from '../../services/badgeService';
import { pool } from '../../config/database';

jest.mock('../../config/database');

describe('BadgeService', () => {
  let badgeService: BadgeService;
  let mockClient: any;

  beforeEach(() => {
    badgeService = new BadgeService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndAwardBadges', () => {
    it('should award new badges when criteria are met', async () => {
      const userId = 1;
      
      // Mock activity summary
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // bugs_fixed
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // prs_reviewed
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // commits
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // prs_merged
        .mockResolvedValueOnce({ rows: [{ current_streak: 7 }] }) // streak
        .mockResolvedValueOnce({ // all badges
          rows: [
            {
              id: 1,
              name: 'Bug Squasher',
              criteria: { bugs_fixed: 10 },
              points: 100
            },
            {
              id: 2,
              name: 'Code Reviewer',
              criteria: { prs_reviewed: 10 },
              points: 100
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }) // user badges (empty - no badges yet)
        .mockResolvedValueOnce(undefined) // INSERT badge 1
        .mockResolvedValueOnce(undefined) // INSERT badge 2
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await badgeService.checkAndAwardBadges(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Bug Squasher');
      expect(result[1].name).toBe('Code Reviewer');
    });

    it('should not award badges already earned', async () => {
      const userId = 1;
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // bugs_fixed
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // prs_reviewed
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // commits
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // prs_merged
        .mockResolvedValueOnce({ rows: [{ current_streak: 7 }] }) // streak
        .mockResolvedValueOnce({ // all badges
          rows: [
            {
              id: 1,
              name: 'Bug Squasher',
              criteria: { bugs_fixed: 10 },
              points: 100
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ badge_id: 1 }] }) // user already has badge
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await badgeService.checkAndAwardBadges(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getUserBadges', () => {
    it('should return user badges', async () => {
      const userId = 1;
      const mockBadges = [
        { id: 1, name: 'Bug Squasher', points: 100 },
        { id: 2, name: 'Code Reviewer', points: 100 }
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockBadges });

      const result = await badgeService.getUserBadges(userId);

      expect(result).toEqual(mockBadges);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT b.* FROM badges b'),
        [userId]
      );
    });
  });

  describe('getBadgeProgress', () => {
    it('should calculate badge progress correctly', async () => {
      const userId = 1;
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // bugs_fixed
        .mockResolvedValueOnce({ rows: [{ count: '8' }] }) // prs_reviewed
        .mockResolvedValueOnce({ rows: [{ count: '30' }] }) // commits
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // prs_merged
        .mockResolvedValueOnce({ rows: [] }) // streak
        .mockResolvedValueOnce({ // all badges
          rows: [
            {
              id: 1,
              name: 'Bug Squasher',
              criteria: { bugs_fixed: 10 },
              points: 100
            },
            {
              id: 2,
              name: 'Code Reviewer',
              criteria: { prs_reviewed: 10 },
              points: 100
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }); // user badges

      const result = await badgeService.getBadgeProgress(userId);

      expect(result).toHaveLength(2);
      expect(result[0].progress).toBe(50); // 5/10 * 100
      expect(result[0].current).toBe(5);
      expect(result[0].target).toBe(10);
      expect(result[0].earned).toBe(false);
      
      expect(result[1].progress).toBe(80); // 8/10 * 100
      expect(result[1].current).toBe(8);
      expect(result[1].target).toBe(10);
    });
  });
});