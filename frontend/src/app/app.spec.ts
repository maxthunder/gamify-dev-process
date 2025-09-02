import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';
import { App } from './app';
import { AuthService } from './services/auth.service';
import { User } from './models';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    github_username: 'testgithub'
  };

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'logout']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    authServiceSpy.currentUser$ = new BehaviorSubject<User | null>(mockUser);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('Component Initialization', () => {
    it('should create the app', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with navigation items', () => {
      expect(component.navigationItems).toBeDefined();
      expect(component.navigationItems.length).toBe(4);
      expect(component.navigationItems[0].path).toBe('/dashboard');
      expect(component.navigationItems[1].path).toBe('/activities');
      expect(component.navigationItems[2].path).toBe('/badges');
      expect(component.navigationItems[3].path).toBe('/leaderboard');
    });

    it('should subscribe to current user on init', () => {
      component.ngOnInit();
      expect(component.currentUser).toEqual(mockUser);
    });

    it('should handle null current user', () => {
      authService.currentUser$ = new BehaviorSubject<User | null>(null);
      component.ngOnInit();
      expect(component.currentUser).toBeNull();
    });
  });

  describe('Authentication State', () => {
    it('should call authService.isAuthenticated', () => {
      authService.isAuthenticated.and.returnValue(true);
      
      const result = component.isAuthenticated();
      
      expect(authService.isAuthenticated).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when not authenticated', () => {
      authService.isAuthenticated.and.returnValue(false);
      
      const result = component.isAuthenticated();
      
      expect(result).toBe(false);
    });
  });

  describe('Logout Functionality', () => {
    it('should logout and navigate to login', () => {
      component.logout();
      
      expect(authService.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Navigation Items', () => {
    it('should have correct navigation structure', () => {
      const expectedItems = [
        { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { path: '/activities', icon: 'timeline', label: 'Activities' },
        { path: '/badges', icon: 'military_tech', label: 'Badges' },
        { path: '/leaderboard', icon: 'leaderboard', label: 'Leaderboard' }
      ];

      expect(component.navigationItems).toEqual(expectedItems);
    });
  });

  describe('Template Rendering', () => {
    it('should render authenticated layout when user is logged in', () => {
      authService.isAuthenticated.and.returnValue(true);
      component.currentUser = mockUser;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.app-layout')).toBeTruthy();
      expect(compiled.querySelector('.auth-layout')).toBeFalsy();
    });

    it('should render auth layout when user is not logged in', () => {
      authService.isAuthenticated.and.returnValue(false);
      component.currentUser = null;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.auth-layout')).toBeTruthy();
      expect(compiled.querySelector('.app-layout')).toBeFalsy();
    });

    it('should display user information when authenticated', () => {
      authService.isAuthenticated.and.returnValue(true);
      component.currentUser = mockUser;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain(mockUser.username);
      expect(compiled.textContent).toContain(mockUser.email);
    });

    it('should display app title in toolbar', () => {
      authService.isAuthenticated.and.returnValue(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Gamification Hub');
    });

    it('should render navigation items in sidebar', () => {
      authService.isAuthenticated.and.returnValue(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      component.navigationItems.forEach(item => {
        expect(compiled.textContent).toContain(item.label);
      });
    });

    it('should have router outlet for content', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('router-outlet')).toBeTruthy();
    });
  });

  describe('User Menu', () => {
    it('should display user menu when user is present', () => {
      authService.isAuthenticated.and.returnValue(true);
      component.currentUser = mockUser;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.user-menu')).toBeTruthy();
    });

    it('should not display user menu when user is null', () => {
      authService.isAuthenticated.and.returnValue(true);
      component.currentUser = null;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.user-menu')).toBeFalsy();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle component creation without errors', () => {
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should maintain component state during re-renders', () => {
      const initialItems = component.navigationItems;
      fixture.detectChanges();
      
      expect(component.navigationItems).toEqual(initialItems);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication service errors gracefully', () => {
      authService.isAuthenticated.and.throwError('Auth error');
      
      expect(() => component.isAuthenticated()).toThrow();
    });

    it('should handle navigation errors', () => {
      router.navigate.and.returnValue(Promise.reject('Navigation failed'));
      
      expect(() => component.logout()).not.toThrow();
      expect(authService.logout).toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should properly subscribe to user changes', () => {
      const userSubject = new BehaviorSubject<User | null>(null);
      authService.currentUser$ = userSubject;
      
      component.ngOnInit();
      expect(component.currentUser).toBeNull();
      
      userSubject.next(mockUser);
      expect(component.currentUser).toEqual(mockUser);
      
      userSubject.next(null);
      expect(component.currentUser).toBeNull();
    });

    it('should handle rapid user changes', () => {
      const userSubject = new BehaviorSubject<User | null>(mockUser);
      authService.currentUser$ = userSubject;
      
      component.ngOnInit();
      
      const updatedUser = { ...mockUser, username: 'updateduser' };
      userSubject.next(updatedUser);
      
      expect(component.currentUser).toEqual(updatedUser);
    });
  });
});
