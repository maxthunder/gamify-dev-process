import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivityService } from '../../services/activity.service';
import { Activity, UserStats } from '../../models';

describe('ActivityService', () => {
  let service: ActivityService;
  let httpMock: HttpTestingController;

  const mockActivities: Activity[] = [
    {
      id: 1,
      user_id: 1,
      activity_type: 'bug_fixed',
      source: 'jira',
      source_id: 'BUG-123',
      source_url: 'https://jira.example.com/BUG-123',
      metadata: { severity: 'high' },
      points_earned: 50,
      activity_date: new Date('2023-12-01T10:00:00Z'),
      created_at: new Date('2023-12-01T10:00:00Z')
    },
    {
      id: 2,
      user_id: 1,
      activity_type: 'pr_reviewed',
      source: 'github',
      source_id: 'PR-456',
      source_url: 'https://github.com/example/repo/pull/456',
      metadata: { lines_changed: 150 },
      points_earned: 25,
      activity_date: new Date('2023-12-02T14:30:00Z'),
      created_at: new Date('2023-12-02T14:30:00Z')
    }
  ];

  const mockUserStats: UserStats = {
    total_points: 1250,
    badges_earned: 8,
    activity_breakdown: [
      { activity_type: 'bug_fixed', count: 15, points: 750 },
      { activity_type: 'pr_reviewed', count: 20, points: 500 }
    ],
    streaks: [
      { streak_type: 'daily_commit', current_streak: 5, longest_streak: 12 },
      { streak_type: 'bug_fixing', current_streak: 2, longest_streak: 8 }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ActivityService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ActivityService);
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

  describe('syncActivities', () => {
    it('should sync activities successfully', () => {
      const mockResponse = { message: 'Activities synced successfully' };

      service.syncActivities().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/activities/sync');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should handle sync error', () => {
      const errorMessage = 'Sync failed';

      service.syncActivities().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/activities/sync');
      req.flush(errorMessage, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getActivities', () => {
    it('should get activities without limit', () => {
      service.getActivities().subscribe(activities => {
        expect(activities).toEqual(mockActivities);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/activities');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);
      req.flush(mockActivities);
    });

    it('should get activities with limit', () => {
      const limit = 5;

      service.getActivities(limit).subscribe(activities => {
        expect(activities).toEqual(mockActivities);
      });

      const req = httpMock.expectOne(req => 
        req.url === 'http://localhost:3000/api/activities' && 
        req.params.get('limit') === '5'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockActivities);
    });

    it('should handle get activities error', () => {
      const errorMessage = 'Failed to fetch activities';

      service.getActivities().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/activities');
      req.flush(errorMessage, { status: 404, statusText: 'Not Found' });
    });

    it('should handle empty activities response', () => {
      service.getActivities().subscribe(activities => {
        expect(activities).toEqual([]);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/activities');
      req.flush([]);
    });
  });

  describe('getUserStats', () => {
    it('should get user stats successfully', () => {
      service.getUserStats().subscribe(stats => {
        expect(stats).toEqual(mockUserStats);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/activities/stats');
      expect(req.request.method).toBe('GET');
      req.flush(mockUserStats);
    });

    it('should handle get stats error', () => {
      const errorMessage = 'Failed to fetch user stats';

      service.getUserStats().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/activities/stats');
      req.flush(errorMessage, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle stats with zero values', () => {
      const emptyStats: UserStats = {
        total_points: 0,
        badges_earned: 0,
        activity_breakdown: [],
        streaks: []
      };

      service.getUserStats().subscribe(stats => {
        expect(stats).toEqual(emptyStats);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/activities/stats');
      req.flush(emptyStats);
    });
  });

  describe('API URL Configuration', () => {
    it('should use correct API base URL', () => {
      service.getUserStats().subscribe();
      const req = httpMock.expectOne('http://localhost:3000/api/activities/stats');
      expect(req.request.url).toBe('http://localhost:3000/api/activities/stats');
      req.flush(mockUserStats);
    });
  });

  describe('HTTP Request Parameters', () => {
    it('should correctly format limit parameter', () => {
      const limits = [1, 5, 10, 50];

      limits.forEach(limit => {
        service.getActivities(limit).subscribe();
        
        const req = httpMock.expectOne(req => 
          req.url === 'http://localhost:3000/api/activities' && 
          req.params.get('limit') === limit.toString()
        );
        req.flush([]);
      });
    });

    it('should handle zero limit parameter', () => {
      service.getActivities(0).subscribe();
      
      const req = httpMock.expectOne(req => 
        req.url === 'http://localhost:3000/api/activities' && 
        req.params.get('limit') === '0'
      );
      req.flush([]);
    });
  });
});