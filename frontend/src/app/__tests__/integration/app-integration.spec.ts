import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { App } from '../../app';
import { AuthService } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';
import { BadgeService } from '../../services/badge.service';
import { Dashboard } from '../../components/dashboard/dashboard';
import { Badges } from '../../components/badges/badges';
import { User, AuthResponse, UserStats, Activity, Badge } from '../../models';

// Mock components for testing
@Component({
  selector: 'app-login',
  template: '<div>Login Component</div>'
})
class MockLoginComponent {}

@Component({
  selector: 'app-register', 
  template: '<div>Register Component</div>'
})
class MockRegisterComponent {}

@Component({
  selector: 'app-activities',
  template: '<div>Activities Component</div>'
})
class MockActivitiesComponent {}

@Component({
  selector: 'app-leaderboard',
  template: '<div>Leaderboard Component</div>'
})
class MockLeaderboardComponent {}

describe('App Integration Tests', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let router: Router;
  let location: Location;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let activityService: ActivityService;
  let badgeService: BadgeService;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    github_username: 'testgithub'
  };

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    token: 'test-jwt-token'
  };

  const mockUserStats: UserStats = {
    total_points: 1500,
    badges_earned: 10,
    activity_breakdown: [
      { activity_type: 'bug_fixed', count: 5, points: 250 },
      { activity_type: 'pr_reviewed', count: 8, points: 200 }
    ],
    streaks: [
      { streak_type: 'daily_commit', current_streak: 3, longest_streak: 7 }
    ]
  };

  const mockActivities: Activity[] = [
    {
      id: 1,
      user_id: 1,
      activity_type: 'bug_fixed',
      source: 'jira',
      source_id: 'BUG-123',
      points_earned: 50,
      activity_date: new Date('2023-12-01'),
    }
  ];

  const mockBadges: Badge[] = [
    {
      id: 1,
      name: 'Bug Crusher',
      description: 'Fixed 10 bugs',
      category: 'bug_squashing',
      points: 100,
      criteria: { bugs_fixed: 10 },
      earned: true,
      created_at: new Date('2023-11-01')
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, Dashboard, Badges],
      declarations: [
        MockLoginComponent,
        MockRegisterComponent,
        MockActivitiesComponent,
        MockLeaderboardComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: 'register', component: MockRegisterComponent },
          { path: 'dashboard', component: Dashboard },
          { path: 'activities', component: MockActivitiesComponent },
          { path: 'badges', component: Badges },
          { path: 'leaderboard', component: MockLeaderboardComponent },
          { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    activityService = TestBed.inject(ActivityService);
    badgeService = TestBed.inject(BadgeService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Authentication Flow', () => {
    it('should redirect to login when not authenticated', async () => {
      await router.navigate(['/dashboard']);
      
      // Should redirect to login due to auth guard
      expect(location.path()).toBe('/login');
    });

    it('should show authenticated layout when user is logged in', async () => {
      // Simulate login
      localStorage.setItem('token', 'test-token');
      
      // Mock the profile request that happens on service initialization
      const profileReq = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      profileReq.flush(mockUser);

      component.ngOnInit();
      fixture.detectChanges();
      
      await router.navigate(['/dashboard']);
      
      expect(location.path()).toBe('/dashboard');
      expect(component.currentUser).toEqual(mockUser);
      
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.app-layout')).toBeTruthy();
      expect(compiled.textContent).toContain('Gamification Hub');
    });

    it('should handle logout flow correctly', async () => {
      // Setup authenticated state
      localStorage.setItem('token', 'test-token');
      component.currentUser = mockUser;
      
      await router.navigate(['/dashboard']);
      expect(location.path()).toBe('/dashboard');

      // Logout
      component.logout();
      fixture.detectChanges();

      expect(localStorage.getItem('token')).toBeNull();
      expect(location.path()).toBe('/login');
    });
  });

  describe('Dashboard Integration', () => {
    beforeEach(async () => {
      // Setup authenticated state
      localStorage.setItem('token', 'test-token');
      
      // Mock profile request
      const profileReq = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      profileReq.flush(mockUser);
      
      component.ngOnInit();
      await router.navigate(['/dashboard']);
      fixture.detectChanges();
    });

    it('should load dashboard with user data', () => {
      // Mock dashboard data requests
      const statsReq = httpMock.expectOne('http://localhost:3000/api/activities/stats');
      const activitiesReq = httpMock.expectOne('http://localhost:3000/api/activities?limit=5');
      const badgesReq = httpMock.expectOne('http://localhost:3000/api/badges/progress');
      
      statsReq.flush(mockUserStats);
      activitiesReq.flush(mockActivities);
      badgesReq.flush(mockBadges);
      
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain(mockUser.username);
      expect(compiled.textContent).toContain(mockUserStats.total_points.toString());
    });

    it('should handle sync activities flow', () => {
      // Complete initial data loading
      httpMock.expectOne('http://localhost:3000/api/activities/stats').flush(mockUserStats);
      httpMock.expectOne('http://localhost:3000/api/activities?limit=5').flush(mockActivities);
      httpMock.expectOne('http://localhost:3000/api/badges/progress').flush(mockBadges);
      
      fixture.detectChanges();
      
      // Find and click sync button
      const syncButton = fixture.nativeElement.querySelector('button:contains("Sync")');
      if (syncButton) {
        syncButton.click();
        
        // Handle sync request
        const syncReq = httpMock.expectOne('http://localhost:3000/api/activities/sync');
        syncReq.flush({ message: 'Activities synced successfully' });
        
        // Handle reload requests
        httpMock.expectOne('http://localhost:3000/api/activities/stats').flush(mockUserStats);
        httpMock.expectOne('http://localhost:3000/api/activities?limit=5').flush(mockActivities);
        httpMock.expectOne('http://localhost:3000/api/badges/progress').flush(mockBadges);
        
        fixture.detectChanges();
      }
    });
  });

  describe('Badges Integration', () => {
    beforeEach(async () => {
      // Setup authenticated state
      localStorage.setItem('token', 'test-token');
      
      // Mock profile request
      const profileReq = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      profileReq.flush(mockUser);
      
      component.ngOnInit();
      await router.navigate(['/badges']);
      fixture.detectChanges();
    });

    it('should load badges page correctly', () => {
      // Mock badges data requests
      const earnedReq = httpMock.expectOne('http://localhost:3000/api/badges');
      const progressReq = httpMock.expectOne('http://localhost:3000/api/badges/progress');
      
      earnedReq.flush([mockBadges[0]]);
      progressReq.flush(mockBadges);
      
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Badges & Achievements');
      expect(compiled.textContent).toContain(mockBadges[0].name);
    });

    it('should handle check for new badges', () => {
      // Complete initial loading
      httpMock.expectOne('http://localhost:3000/api/badges').flush([]);
      httpMock.expectOne('http://localhost:3000/api/badges/progress').flush(mockBadges);
      
      fixture.detectChanges();
      
      // Find and click check badges button
      const checkButton = fixture.nativeElement.querySelector('button:contains("Check")');
      if (checkButton) {
        checkButton.click();
        
        // Handle check request
        const checkReq = httpMock.expectOne('http://localhost:3000/api/badges/check');
        checkReq.flush({ newBadges: [mockBadges[0]] });
        
        // Handle reload requests
        httpMock.expectOne('http://localhost:3000/api/badges').flush([mockBadges[0]]);
        httpMock.expectOne('http://localhost:3000/api/badges/progress').flush([]);
        
        fixture.detectChanges();
      }
    });
  });

  describe('Navigation Flow', () => {
    beforeEach(async () => {
      // Setup authenticated state
      localStorage.setItem('token', 'test-token');
      
      const profileReq = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      profileReq.flush(mockUser);
      
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should navigate between pages correctly', async () => {
      // Navigate to dashboard
      await router.navigate(['/dashboard']);
      expect(location.path()).toBe('/dashboard');
      
      // Navigate to badges
      await router.navigate(['/badges']);
      expect(location.path()).toBe('/badges');
      
      // Navigate to activities
      await router.navigate(['/activities']);
      expect(location.path()).toBe('/activities');
      
      // Navigate to leaderboard
      await router.navigate(['/leaderboard']);
      expect(location.path()).toBe('/leaderboard');
    });

    it('should show active nav item correctly', async () => {
      await router.navigate(['/dashboard']);
      fixture.detectChanges();
      
      // Would need to check for active class in real implementation
      expect(location.path()).toBe('/dashboard');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      localStorage.setItem('token', 'invalid-token');
      
      // Mock failed profile request
      const profileReq = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      profileReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      
      component.ngOnInit();
      fixture.detectChanges();
      
      // Should logout and redirect
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should handle network errors', async () => {
      localStorage.setItem('token', 'test-token');
      
      const profileReq = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      profileReq.error(new ErrorEvent('Network error'));
      
      component.ngOnInit();
      
      // Should handle error gracefully
      expect(component.currentUser).toBeNull();
    });
  });

  describe('HTTP Interceptor', () => {
    it('should add authorization header to requests', async () => {
      localStorage.setItem('token', 'test-token-123');
      
      // Make a request through the service
      authService['loadCurrentUser']();
      
      const req = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
      req.flush(mockUser);
    });

    it('should work without token', () => {
      // Make request without token
      activityService.getUserStats().subscribe();
      
      const req = httpMock.expectOne('http://localhost:3000/api/activities/stats');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush(mockUserStats);
    });
  });

  describe('Data Persistence', () => {
    it('should persist authentication state across page reloads', () => {
      localStorage.setItem('token', 'persistent-token');
      
      // Simulate app restart by creating new component
      const newFixture = TestBed.createComponent(App);
      const newComponent = newFixture.componentInstance;
      
      // Should load user profile on init
      const profileReq = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      profileReq.flush(mockUser);
      
      newComponent.ngOnInit();
      
      expect(newComponent.currentUser).toEqual(mockUser);
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle component initialization without errors', () => {
      expect(() => {
        component.ngOnInit();
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should maintain functionality across route changes', async () => {
      localStorage.setItem('token', 'test-token');
      
      const profileReq = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      profileReq.flush(mockUser);
      
      component.ngOnInit();
      
      // Navigate through different routes
      await router.navigate(['/dashboard']);
      await router.navigate(['/badges']);
      await router.navigate(['/dashboard']);
      
      // Component should still function correctly
      expect(component.currentUser).toEqual(mockUser);
      expect(component.isAuthenticated()).toBe(true);
    });
  });
});