import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BadgeService } from '../../services/badge.service';
import { Badge } from '../../models';

describe('BadgeService', () => {
  let service: BadgeService;
  let httpMock: HttpTestingController;

  const mockEarnedBadges: Badge[] = [
    {
      id: 1,
      name: 'Bug Crusher',
      description: 'Fixed 10 bugs',
      category: 'bug_squashing',
      icon_url: '/assets/icons/bug-crusher.png',
      points: 100,
      criteria: { bugs_fixed: 10 },
      earned: true,
      created_at: new Date('2023-11-01T10:00:00Z')
    },
    {
      id: 2,
      name: 'Code Reviewer',
      description: 'Reviewed 25 pull requests',
      category: 'code_review',
      icon_url: '/assets/icons/code-reviewer.png',
      points: 150,
      criteria: { prs_reviewed: 25 },
      earned: true,
      created_at: new Date('2023-11-15T14:30:00Z')
    }
  ];

  const mockProgressBadges: Badge[] = [
    {
      id: 3,
      name: 'Streak Master',
      description: 'Maintain a 30-day commit streak',
      category: 'streak',
      icon_url: '/assets/icons/streak-master.png',
      points: 200,
      criteria: { commit_streak: 30 },
      earned: false,
      progress: 60,
      current: 18,
      target: 30
    },
    {
      id: 4,
      name: 'Milestone Achiever',
      description: 'Reach 1000 total points',
      category: 'milestone',
      icon_url: '/assets/icons/milestone.png',
      points: 300,
      criteria: { total_points: 1000 },
      earned: false,
      progress: 75,
      current: 750,
      target: 1000
    }
  ];

  const mockNewBadgesResponse = {
    newBadges: [mockEarnedBadges[0]]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BadgeService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(BadgeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getUserBadges', () => {
    it('should get user badges successfully', () => {
      service.getUserBadges().subscribe(badges => {
        expect(badges).toEqual(mockEarnedBadges);
        expect(badges.length).toBe(2);
        expect(badges[0].earned).toBe(true);
        expect(badges[1].earned).toBe(true);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges');
      expect(req.request.method).toBe('GET');
      req.flush(mockEarnedBadges);
    });

    it('should handle empty badges response', () => {
      service.getUserBadges().subscribe(badges => {
        expect(badges).toEqual([]);
        expect(badges.length).toBe(0);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges');
      req.flush([]);
    });

    it('should handle get badges error', () => {
      const errorMessage = 'Failed to fetch badges';

      service.getUserBadges().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges');
      req.flush(errorMessage, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle unauthorized access', () => {
      service.getUserBadges().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('getBadgeProgress', () => {
    it('should get badge progress successfully', () => {
      service.getBadgeProgress().subscribe(badges => {
        expect(badges).toEqual(mockProgressBadges);
        expect(badges.length).toBe(2);
        expect(badges[0].earned).toBe(false);
        expect(badges[0].current).toBeDefined();
        expect(badges[0].target).toBeDefined();
        expect(badges[0].progress).toBeDefined();
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges/progress');
      expect(req.request.method).toBe('GET');
      req.flush(mockProgressBadges);
    });

    it('should handle empty progress response', () => {
      service.getBadgeProgress().subscribe(badges => {
        expect(badges).toEqual([]);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges/progress');
      req.flush([]);
    });

    it('should handle get progress error', () => {
      const errorMessage = 'Failed to fetch badge progress';

      service.getBadgeProgress().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges/progress');
      req.flush(errorMessage, { status: 404, statusText: 'Not Found' });
    });

    it('should validate progress data structure', () => {
      service.getBadgeProgress().subscribe(badges => {
        badges.forEach(badge => {
          expect(badge.current).toBeGreaterThanOrEqual(0);
          expect(badge.target).toBeGreaterThan(0);
          expect(badge.progress).toBeGreaterThanOrEqual(0);
          expect(badge.progress).toBeLessThanOrEqual(100);
        });
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges/progress');
      req.flush(mockProgressBadges);
    });
  });

  describe('checkBadges', () => {
    it('should check for new badges successfully', () => {
      service.checkBadges().subscribe(response => {
        expect(response).toEqual(mockNewBadgesResponse);
        expect(response.newBadges).toBeDefined();
        expect(response.newBadges.length).toBe(1);
        expect(response.newBadges[0].name).toBe('Bug Crusher');
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges/check');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockNewBadgesResponse);
    });

    it('should handle no new badges', () => {
      const noNewBadges = { newBadges: [] };

      service.checkBadges().subscribe(response => {
        expect(response).toEqual(noNewBadges);
        expect(response.newBadges.length).toBe(0);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges/check');
      req.flush(noNewBadges);
    });

    it('should handle multiple new badges', () => {
      const multipleNewBadges = { newBadges: mockEarnedBadges };

      service.checkBadges().subscribe(response => {
        expect(response.newBadges.length).toBe(2);
        expect(response.newBadges).toEqual(mockEarnedBadges);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges/check');
      req.flush(multipleNewBadges);
    });

    it('should handle check badges error', () => {
      const errorMessage = 'Failed to check badges';

      service.checkBadges().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges/check');
      req.flush(errorMessage, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle rate limiting', () => {
      service.checkBadges().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(429);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges/check');
      req.flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
    });
  });

  describe('API URL Configuration', () => {
    it('should use correct API base URL for all endpoints', () => {
      const baseUrl = 'http://localhost:3000/api';

      // Test getUserBadges URL
      service.getUserBadges().subscribe();
      const badgesReq = httpMock.expectOne(`${baseUrl}/badges`);
      expect(badgesReq.request.url).toBe(`${baseUrl}/badges`);
      badgesReq.flush([]);

      // Test getBadgeProgress URL
      service.getBadgeProgress().subscribe();
      const progressReq = httpMock.expectOne(`${baseUrl}/badges/progress`);
      expect(progressReq.request.url).toBe(`${baseUrl}/badges/progress`);
      progressReq.flush([]);

      // Test checkBadges URL
      service.checkBadges().subscribe();
      const checkReq = httpMock.expectOne(`${baseUrl}/badges/check`);
      expect(checkReq.request.url).toBe(`${baseUrl}/badges/check`);
      checkReq.flush({ newBadges: [] });
    });
  });

  describe('Badge Categories', () => {
    it('should handle different badge categories correctly', () => {
      const categorizedBadges: Badge[] = [
        { ...mockEarnedBadges[0], category: 'bug_squashing' },
        { ...mockEarnedBadges[1], category: 'code_review' },
        { ...mockProgressBadges[0], category: 'streak' },
        { ...mockProgressBadges[1], category: 'milestone' }
      ];

      service.getUserBadges().subscribe(badges => {
        const categories = badges.map(badge => badge.category);
        expect(categories).toContain('bug_squashing');
        expect(categories).toContain('code_review');
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges');
      req.flush(categorizedBadges.filter(b => b.earned));
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      service.getUserBadges().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges');
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle malformed response data', () => {
      service.getUserBadges().subscribe(badges => {
        expect(Array.isArray(badges)).toBe(true);
        // Service should handle malformed data gracefully
      });

      const req = httpMock.expectOne('http://localhost:3000/api/badges');
      req.flush(null); // Malformed response
    });
  });
});