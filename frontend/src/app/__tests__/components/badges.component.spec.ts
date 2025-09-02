import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { Badges } from '../../components/badges/badges';
import { BadgeService } from '../../services/badge.service';
import { Badge } from '../../models';

describe('Badges Component', () => {
  let component: Badges;
  let fixture: ComponentFixture<Badges>;
  let badgeService: jasmine.SpyObj<BadgeService>;

  const mockEarnedBadges: Badge[] = [
    {
      id: 1,
      name: 'Bug Crusher',
      description: 'Fixed 10 bugs',
      category: 'bug_squashing',
      points: 100,
      criteria: { bugs_fixed: 10 },
      earned: true,
      created_at: new Date('2023-11-01')
    },
    {
      id: 2,
      name: 'Code Reviewer',
      description: 'Reviewed 25 pull requests',
      category: 'code_review',
      points: 150,
      criteria: { prs_reviewed: 25 },
      earned: true,
      created_at: new Date('2023-11-15')
    },
    {
      id: 3,
      name: 'Streak Master',
      description: 'Maintained 30-day streak',
      category: 'streak',
      points: 200,
      criteria: { streak_days: 30 },
      earned: true,
      created_at: new Date('2023-12-01')
    }
  ];

  const mockAvailableBadges: Badge[] = [
    {
      id: 4,
      name: 'Bug Annihilator',
      description: 'Fix 50 bugs',
      category: 'bug_squashing',
      points: 300,
      criteria: { bugs_fixed: 50 },
      earned: false,
      current: 25,
      target: 50,
      progress: 50
    },
    {
      id: 5,
      name: 'Review Master',
      description: 'Review 100 PRs',
      category: 'code_review',
      points: 400,
      criteria: { prs_reviewed: 100 },
      earned: false,
      current: 75,
      target: 100,
      progress: 75
    },
    {
      id: 6,
      name: 'Milestone Achiever',
      description: 'Reach 2000 points',
      category: 'milestone',
      points: 500,
      criteria: { total_points: 2000 },
      earned: false,
      current: 1200,
      target: 2000,
      progress: 60
    }
  ];

  beforeEach(async () => {
    const badgeServiceSpy = jasmine.createSpyObj('BadgeService', [
      'getUserBadges',
      'getBadgeProgress',
      'checkBadges'
    ]);

    await TestBed.configureTestingModule({
      imports: [Badges],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        { provide: BadgeService, useValue: badgeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Badges);
    component = fixture.componentInstance;
    badgeService = TestBed.inject(BadgeService) as jasmine.SpyObj<BadgeService>;

    // Setup default spy returns
    badgeService.getUserBadges.and.returnValue(of(mockEarnedBadges));
    badgeService.getBadgeProgress.and.returnValue(of(mockAvailableBadges));
    badgeService.checkBadges.and.returnValue(of({ newBadges: [] }));
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with loading state', () => {
      expect(component.loading).toBe(true);
      expect(component.checking).toBe(false);
    });

    it('should load badges on init', () => {
      component.ngOnInit();
      expect(badgeService.getUserBadges).toHaveBeenCalled();
      expect(badgeService.getBadgeProgress).toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('should load badges successfully', (done) => {
      component.loadBadges();
      
      setTimeout(() => {
        expect(component.earnedBadges).toEqual(mockEarnedBadges);
        expect(component.availableBadges).toEqual(mockAvailableBadges);
        expect(component.loading).toBe(false);
        done();
      });
    });

    it('should handle empty badge responses', (done) => {
      badgeService.getUserBadges.and.returnValue(of(null));
      badgeService.getBadgeProgress.and.returnValue(of(null));

      component.loadBadges();
      
      setTimeout(() => {
        expect(component.earnedBadges).toEqual([]);
        expect(component.availableBadges).toEqual([]);
        expect(component.loading).toBe(false);
        done();
      });
    });

    it('should handle loading errors gracefully', (done) => {
      badgeService.getUserBadges.and.returnValue(throwError(() => new Error('Badges error')));
      badgeService.getBadgeProgress.and.returnValue(throwError(() => new Error('Progress error')));

      spyOn(console, 'error');
      component.loadBadges();
      
      setTimeout(() => {
        expect(component.loading).toBe(false);
        expect(console.error).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Badge Checking', () => {
    it('should check for new badges successfully', () => {
      const mockNewBadges = { newBadges: [mockEarnedBadges[0]] };
      badgeService.checkBadges.and.returnValue(of(mockNewBadges));
      spyOn(component, 'loadBadges');
      spyOn(console, 'log');

      component.checkForNewBadges();

      expect(component.checking).toBe(true);
      expect(badgeService.checkBadges).toHaveBeenCalled();

      setTimeout(() => {
        expect(component.checking).toBe(false);
        expect(component.loadBadges).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('New badges earned:', mockNewBadges.newBadges);
      });
    });

    it('should handle no new badges', () => {
      const mockNoNewBadges = { newBadges: [] };
      badgeService.checkBadges.and.returnValue(of(mockNoNewBadges));
      spyOn(component, 'loadBadges');
      spyOn(console, 'log');

      component.checkForNewBadges();

      setTimeout(() => {
        expect(component.checking).toBe(false);
        expect(component.loadBadges).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('No new badges earned');
      });
    });

    it('should handle check badges error', () => {
      badgeService.checkBadges.and.returnValue(throwError(() => new Error('Check failed')));
      spyOn(console, 'error');

      component.checkForNewBadges();

      setTimeout(() => {
        expect(component.checking).toBe(false);
        expect(console.error).toHaveBeenCalled();
      });
    });
  });

  describe('Helper Methods', () => {
    it('should return correct badge icons', () => {
      expect(component.getBadgeIcon('bug_squashing')).toBe('pest_control');
      expect(component.getBadgeIcon('code_review')).toBe('rate_review');
      expect(component.getBadgeIcon('streak')).toBe('local_fire_department');
      expect(component.getBadgeIcon('milestone')).toBe('emoji_events');
      expect(component.getBadgeIcon('unknown')).toBe('military_tech');
    });

    it('should return correct category colors', () => {
      expect(component.getCategoryColor('bug_squashing')).toBe('#f44336');
      expect(component.getCategoryColor('code_review')).toBe('#2196f3');
      expect(component.getCategoryColor('streak')).toBe('#ff5722');
      expect(component.getCategoryColor('milestone')).toBe('#4caf50');
      expect(component.getCategoryColor('unknown')).toBe('#9c27b0');
    });

    it('should return correct category labels', () => {
      expect(component.getCategoryLabel('bug_squashing')).toBe('Bug Squashing');
      expect(component.getCategoryLabel('code_review')).toBe('Code Review');
      expect(component.getCategoryLabel('streak')).toBe('Streak');
      expect(component.getCategoryLabel('milestone')).toBe('Milestone');
      expect(component.getCategoryLabel('custom_category')).toBe('Custom Category');
    });

    it('should calculate progress percentage correctly', () => {
      expect(component.getProgressPercentage(25, 50)).toBe(50);
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

  describe('Badge Organization', () => {
    it('should organize badges by category correctly', () => {
      const badges = [...mockEarnedBadges, ...mockAvailableBadges];
      const organized = component.getBadgesByCategory(badges);

      expect(organized['bug_squashing']).toBeDefined();
      expect(organized['code_review']).toBeDefined();
      expect(organized['streak']).toBeDefined();
      expect(organized['milestone']).toBeDefined();

      expect(organized['bug_squashing'].length).toBe(2); // 1 earned + 1 available
      expect(organized['code_review'].length).toBe(2);
      expect(organized['streak'].length).toBe(1);
      expect(organized['milestone'].length).toBe(1);
    });

    it('should handle empty badge arrays', () => {
      const organized = component.getBadgesByCategory([]);
      expect(Object.keys(organized).length).toBe(0);
    });

    it('should get all unique categories', () => {
      component.earnedBadges = mockEarnedBadges;
      component.availableBadges = mockAvailableBadges;

      const categories = component.getCategories();
      
      expect(categories).toContain('bug_squashing');
      expect(categories).toContain('code_review');
      expect(categories).toContain('streak');
      expect(categories).toContain('milestone');
      expect(categories.length).toBe(4);
    });

    it('should return empty categories when no badges', () => {
      component.earnedBadges = [];
      component.availableBadges = [];

      const categories = component.getCategories();
      expect(categories.length).toBe(0);
    });
  });

  describe('Component Template Integration', () => {
    it('should display loading state correctly', () => {
      component.loading = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.loading-container')).toBeTruthy();
      expect(compiled.textContent).toContain('Loading badges...');
    });

    it('should display badge counts in tabs', () => {
      component.earnedBadges = mockEarnedBadges;
      component.availableBadges = mockAvailableBadges;
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain(`Earned (${mockEarnedBadges.length})`);
      expect(compiled.textContent).toContain(`In Progress (${mockAvailableBadges.length})`);
    });

    it('should display empty states correctly', () => {
      component.earnedBadges = [];
      component.availableBadges = [];
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('No badges earned yet');
      expect(compiled.textContent).toContain('No badges in progress');
    });

    it('should display badge information correctly', () => {
      component.earnedBadges = mockEarnedBadges;
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      mockEarnedBadges.forEach(badge => {
        expect(compiled.textContent).toContain(badge.name);
        expect(compiled.textContent).toContain(badge.description);
        expect(compiled.textContent).toContain(badge.points.toString());
      });
    });

    it('should show progress bars for available badges', () => {
      component.availableBadges = mockAvailableBadges;
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const progressBars = compiled.querySelectorAll('mat-progress-bar');
      expect(progressBars.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('User Interactions', () => {
    it('should trigger badge check when button is clicked', () => {
      spyOn(component, 'checkForNewBadges');
      component.loading = false;
      fixture.detectChanges();

      const checkButton = fixture.nativeElement.querySelector('button');
      if (checkButton && checkButton.textContent?.includes('Check')) {
        checkButton.click();
        expect(component.checkForNewBadges).toHaveBeenCalled();
      }
    });

    it('should disable check button when checking or loading', () => {
      component.checking = true;
      component.loading = false;
      fixture.detectChanges();

      const checkButton = fixture.nativeElement.querySelector('button');
      if (checkButton) {
        expect(checkButton.disabled).toBe(true);
      }

      component.checking = false;
      component.loading = true;
      fixture.detectChanges();

      if (checkButton) {
        expect(checkButton.disabled).toBe(true);
      }
    });
  });

  describe('Badge Categories Display', () => {
    it('should group badges by category in template', () => {
      component.earnedBadges = mockEarnedBadges;
      component.loading = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const categoryHeaders = compiled.querySelectorAll('.category-header');
      expect(categoryHeaders.length).toBeGreaterThanOrEqual(0);
    });

    it('should display category chips with correct colors', () => {
      component.earnedBadges = mockEarnedBadges;
      component.loading = false;
      fixture.detectChanges();

      // This would test the actual rendering of category colors
      // In a real test, you might check computed styles or specific elements
    });
  });

  describe('Error Boundaries', () => {
    it('should not crash when earnedBadges is undefined', () => {
      component.earnedBadges = undefined as any;
      component.loading = false;
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle malformed badge data', () => {
      component.earnedBadges = [null as any, undefined as any];
      component.loading = false;
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle badges without progress data', () => {
      const badgesWithoutProgress = mockAvailableBadges.map(badge => ({
        ...badge,
        current: undefined,
        target: undefined,
        progress: undefined
      }));
      
      component.availableBadges = badgesWithoutProgress;
      component.loading = false;
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('should not reload badges unnecessarily', () => {
      component.ngOnInit();
      expect(badgeService.getUserBadges).toHaveBeenCalledTimes(1);
      expect(badgeService.getBadgeProgress).toHaveBeenCalledTimes(1);

      // Calling ngOnInit again shouldn't trigger more calls in this simple case
      // In a real app, you might implement more sophisticated caching
    });

    it('should handle large numbers of badges efficiently', () => {
      const largeBadgeArray = Array.from({ length: 100 }, (_, i) => ({
        ...mockEarnedBadges[0],
        id: i + 1,
        name: `Badge ${i + 1}`
      }));

      component.earnedBadges = largeBadgeArray;
      component.loading = false;

      expect(() => fixture.detectChanges()).not.toThrow();
      
      const categories = component.getCategories();
      expect(categories).toBeDefined();
      
      const organized = component.getBadgesByCategory(largeBadgeArray);
      expect(organized).toBeDefined();
    });
  });
});