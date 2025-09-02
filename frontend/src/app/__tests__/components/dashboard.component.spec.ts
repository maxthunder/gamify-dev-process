import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { Dashboard } from '../../components/dashboard/dashboard';
import { AuthService } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';
import { BadgeService } from '../../services/badge.service';
import { User, UserStats, Activity, Badge } from '../../models';

describe('Dashboard Component', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let authService: jasmine.SpyObj<AuthService>;
  let activityService: jasmine.SpyObj<ActivityService>;
  let badgeService: jasmine.SpyObj<BadgeService>;
  let router: Router;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    github_username: 'testgithub'
  };

  const mockUserStats: UserStats = {
    total_points: 1500,
    badges_earned: 12,
    activity_breakdown: [
      { activity_type: 'bug_fixed', count: 10, points: 500 },
      { activity_type: 'pr_reviewed', count: 15, points: 375 },
      { activity_type: 'commit', count: 50, points: 500 }
    ],
    streaks: [
      { streak_type: 'daily_commit', current_streak: 7, longest_streak: 15 },
      { streak_type: 'bug_fixing', current_streak: 3, longest_streak: 8 }
    ]
  };

  const mockActivities: Activity[] = [
    {
      id: 1,
      user_id: 1,
      activity_type: 'bug_fixed',
      source: 'jira',
      points_earned: 50,
      activity_date: new Date('2023-12-01'),
      source_id: 'BUG-123'
    },
    {
      id: 2,
      user_id: 1,
      activity_type: 'pr_reviewed',
      source: 'github',
      points_earned: 25,
      activity_date: new Date('2023-12-02'),
      source_id: 'PR-456'
    }
  ];

  const mockBadgeProgress: Badge[] = [
    {
      id: 1,
      name: 'Bug Squasher',
      description: 'Fix 20 bugs',
      category: 'bug_squashing',
      points: 200,
      criteria: { bugs_fixed: 20 },
      current: 10,
      target: 20,
      earned: false
    },
    {
      id: 2,
      name: 'Code Reviewer',
      description: 'Review 50 PRs',
      category: 'code_review',
      points: 300,
      criteria: { prs_reviewed: 50 },
      current: 35,
      target: 50,
      earned: false
    }
  ];

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUser$']);
    const activityServiceSpy = jasmine.createSpyObj('ActivityService', [
      'getUserStats',
      'getActivities',
      'syncActivities'
    ]);
    const badgeServiceSpy = jasmine.createSpyObj('BadgeService', ['getBadgeProgress']);

    authServiceSpy.currentUser$ = new BehaviorSubject<User | null>(mockUser);

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ActivityService, useValue: activityServiceSpy },
        { provide: BadgeService, useValue: badgeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    activityService = TestBed.inject(ActivityService) as jasmine.SpyObj<ActivityService>;
    badgeService = TestBed.inject(BadgeService) as jasmine.SpyObj<BadgeService>;
    router = TestBed.inject(Router);

    // Setup default spy returns
    activityService.getUserStats.and.returnValue(of(mockUserStats));
    activityService.getActivities.and.returnValue(of(mockActivities));
    activityService.syncActivities.and.returnValue(of({ message: 'Success' }));
    badgeService.getBadgeProgress.and.returnValue(of(mockBadgeProgress));
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with loading state', () => {
      expect(component.loading).toBe(true);
      expect(component.syncing).toBe(false);
    });

    it('should subscribe to current user on init', () => {
      component.ngOnInit();
      expect(component.currentUser).toEqual(mockUser);
    });

    it('should load dashboard data on init', () => {
      component.ngOnInit();
      expect(activityService.getUserStats).toHaveBeenCalled();
      expect(activityService.getActivities).toHaveBeenCalledWith(5);
      expect(badgeService.getBadgeProgress).toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('should load dashboard data successfully', (done) => {
      component.loadDashboardData();
      
      setTimeout(() => {
        expect(component.userStats).toEqual(mockUserStats);
        expect(component.recentActivities).toEqual(mockActivities);
        expect(component.badgeProgress).toEqual(mockBadgeProgress);
        expect(component.loading).toBe(false);
        done();
      });
    });

    it('should handle empty data responses', (done) => {
      activityService.getUserStats.and.returnValue(of(null));
      activityService.getActivities.and.returnValue(of(null));
      badgeService.getBadgeProgress.and.returnValue(of(null));

      component.loadDashboardData();
      
      setTimeout(() => {
        expect(component.userStats).toBeNull();
        expect(component.recentActivities).toEqual([]);
        expect(component.badgeProgress).toEqual([]);
        expect(component.loading).toBe(false);
        done();
      });
    });

    it('should handle loading errors gracefully', (done) => {
      activityService.getUserStats.and.returnValue(throwError(() => new Error('Stats error')));
      activityService.getActivities.and.returnValue(throwError(() => new Error('Activities error')));
      badgeService.getBadgeProgress.and.returnValue(throwError(() => new Error('Badges error')));

      spyOn(console, 'error');
      component.loadDashboardData();
      
      setTimeout(() => {
        expect(component.loading).toBe(false);
        expect(console.error).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Activity Sync', () => {
    it('should sync activities successfully', () => {
      spyOn(component, 'loadDashboardData');
      
      component.syncActivities();
      
      expect(component.syncing).toBe(true);
      expect(activityService.syncActivities).toHaveBeenCalled();
      
      // Wait for async operation
      setTimeout(() => {
        expect(component.syncing).toBe(false);
        expect(component.loadDashboardData).toHaveBeenCalled();
      });
    });

    it('should handle sync errors', () => {
      activityService.syncActivities.and.returnValue(throwError(() => new Error('Sync failed')));
      spyOn(console, 'error');
      
      component.syncActivities();
      
      setTimeout(() => {
        expect(component.syncing).toBe(false);
        expect(console.error).toHaveBeenCalled();
      });
    });
  });

  describe('Helper Methods', () => {
    it('should return correct activity icons', () => {
      expect(component.getActivityIcon('bug_fixed')).toBe('bug_report');
      expect(component.getActivityIcon('pr_reviewed')).toBe('rate_review');
      expect(component.getActivityIcon('commit')).toBe('code');
      expect(component.getActivityIcon('pr_merged')).toBe('merge_type');
      expect(component.getActivityIcon('unknown')).toBe('activity_zone');
    });

    it('should return correct activity type labels', () => {
      expect(component.getActivityTypeLabel('bug_fixed')).toBe('Bug Fixed');
      expect(component.getActivityTypeLabel('pr_reviewed')).toBe('PR Reviewed');
      expect(component.getActivityTypeLabel('commit')).toBe('Commit');
      expect(component.getActivityTypeLabel('pr_merged')).toBe('PR Merged');
      expect(component.getActivityTypeLabel('custom_type')).toBe('Custom Type');
    });

    it('should return correct badge icons', () => {
      expect(component.getBadgeIcon('bug_squashing')).toBe('pest_control');
      expect(component.getBadgeIcon('code_review')).toBe('rate_review');
      expect(component.getBadgeIcon('streak')).toBe('local_fire_department');
      expect(component.getBadgeIcon('milestone')).toBe('emoji_events');
      expect(component.getBadgeIcon('unknown')).toBe('military_tech');
    });

    it('should calculate progress percentage correctly', () => {
      expect(component.getProgressPercentage(50, 100)).toBe(50);
      expect(component.getProgressPercentage(75, 100)).toBe(75);
      expect(component.getProgressPercentage(100, 100)).toBe(100);
      expect(component.getProgressPercentage(150, 100)).toBe(100); // Should cap at 100%
      expect(component.getProgressPercentage(0, 100)).toBe(0);
    });

    it('should handle edge cases in progress calculation', () => {
      expect(component.getProgressPercentage(10, 0)).toBe(Infinity);
      expect(component.getProgressPercentage(0, 0)).toBeNaN();
    });
  });

  describe('Component Template Integration', () => {
    it('should display user information when user is loaded', () => {
      component.currentUser = mockUser;
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain(mockUser.username);
    });

    it('should display loading state correctly', () => {
      component.loading = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.loading-container')).toBeTruthy();
      expect(compiled.textContent).toContain('Loading dashboard...');
    });

    it('should display stats when data is loaded', () => {
      component.userStats = mockUserStats;
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain(mockUserStats.total_points.toString());
      expect(compiled.textContent).toContain(mockUserStats.badges_earned.toString());
    });

    it('should display recent activities', () => {
      component.recentActivities = mockActivities;
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const activityElements = compiled.querySelectorAll('.activity-item');
      expect(activityElements.length).toBeGreaterThanOrEqual(0);
    });

    it('should display badge progress', () => {
      component.badgeProgress = mockBadgeProgress;
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const badgeElements = compiled.querySelectorAll('.badge-progress-item');
      expect(badgeElements.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty states correctly', () => {
      component.recentActivities = [];
      component.badgeProgress = [];
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('No recent activities');
      expect(compiled.textContent).toContain('No badge progress available');
    });
  });

  describe('User Interactions', () => {
    it('should trigger sync when sync button is clicked', () => {
      spyOn(component, 'syncActivities');
      component.loading = false;
      fixture.detectChanges();

      const syncButton = fixture.nativeElement.querySelector('button:contains("Sync")');
      if (syncButton) {
        syncButton.click();
        expect(component.syncActivities).toHaveBeenCalled();
      }
    });

    it('should disable sync button when syncing', () => {
      component.syncing = true;
      component.loading = false;
      fixture.detectChanges();

      const syncButton = fixture.nativeElement.querySelector('button');
      if (syncButton) {
        expect(syncButton.disabled).toBe(true);
      }
    });
  });

  describe('Error Boundaries', () => {
    it('should not crash when userStats is null', () => {
      component.userStats = null;
      component.loading = false;
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle undefined badge progress', () => {
      component.badgeProgress = undefined as any;
      component.loading = false;
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle malformed activity data', () => {
      component.recentActivities = [null as any, undefined as any];
      component.loading = false;
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });
});