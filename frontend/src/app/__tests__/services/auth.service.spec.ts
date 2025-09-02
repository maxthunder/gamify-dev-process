import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { User, AuthResponse } from '../../models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    github_username: 'testgithub',
    jira_account_id: 'test-jira-123'
  };

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    token: 'test-jwt-token'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with no current user when no token in localStorage', () => {
      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should load current user when token exists in localStorage', () => {
      localStorage.setItem('token', 'existing-token');
      
      // Create a new service instance to trigger the constructor logic
      const newService = new AuthService(TestBed.inject(HttpClient));
      
      const req = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);

      newService.currentUser$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });
  });

  describe('register', () => {
    const registerData = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      github_username: 'newgithub',
      jira_account_id: 'new-jira-123'
    };

    it('should register user successfully', () => {
      service.register(registerData).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(localStorage.getItem('token')).toBe('test-jwt-token');
      });

      const req = httpMock.expectOne('http://localhost:3000/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerData);
      req.flush(mockAuthResponse);

      // Check that current user is updated
      service.currentUser$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should handle registration error', () => {
      const errorMessage = 'Registration failed';
      
      service.register(registerData).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/auth/register');
      req.flush(errorMessage, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('login', () => {
    const loginData = { email: 'test@example.com', password: 'password123' };

    it('should login user successfully', () => {
      service.login(loginData.email, loginData.password).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(localStorage.getItem('token')).toBe('test-jwt-token');
      });

      const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginData);
      req.flush(mockAuthResponse);

      // Check that current user is updated
      service.currentUser$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should handle login error', () => {
      const errorMessage = 'Invalid credentials';
      
      service.login(loginData.email, loginData.password).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
      req.flush(errorMessage, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('logout', () => {
    it('should logout user and clear data', () => {
      // Set up logged in state
      localStorage.setItem('token', 'test-token');
      service['currentUserSubject'].next(mockUser);

      service.logout();

      expect(localStorage.getItem('token')).toBeNull();
      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('token', 'test-token');
      expect(service.getToken()).toBe('test-token');
    });

    it('should return null when no token exists', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('token', 'test-token');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when no token exists', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('loadCurrentUser', () => {
    it('should handle successful profile load', () => {
      localStorage.setItem('token', 'test-token');
      
      // Trigger loadCurrentUser by calling it directly via any
      (service as any).loadCurrentUser();

      const req = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);

      service.currentUser$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should handle profile load error and logout', () => {
      localStorage.setItem('token', 'invalid-token');
      
      // Trigger loadCurrentUser
      (service as any).loadCurrentUser();

      const req = httpMock.expectOne('http://localhost:3000/api/auth/profile');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Should logout on error
      expect(localStorage.getItem('token')).toBeNull();
      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });
  });
});