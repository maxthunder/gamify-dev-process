import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ActivityService } from '../../services/activity.service';
import { BadgeService } from '../../services/badge.service';
import { User, UserStats, Activity, Badge } from '../../models';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,
    MatGridListModule,
    RouterModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  currentUser: User | null = null;
  userStats: UserStats | null = null;
  recentActivities: Activity[] = [];
  badgeProgress: Badge[] = [];
  loading = true;
  syncing = false;

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private badgeService: BadgeService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    
    Promise.all([
      this.activityService.getUserStats().toPromise(),
      this.activityService.getActivities(5).toPromise(),
      this.badgeService.getBadgeProgress().toPromise()
    ]).then(([stats, activities, badges]) => {
      this.userStats = stats;
      this.recentActivities = activities || [];
      this.badgeProgress = badges || [];
      this.loading = false;
    }).catch(error => {
      console.error('Error loading dashboard data:', error);
      this.loading = false;
    });
  }

  syncActivities() {
    this.syncing = true;
    this.activityService.syncActivities().subscribe({
      next: () => {
        this.syncing = false;
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('Error syncing activities:', error);
        this.syncing = false;
      }
    });
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'bug_fixed': return 'bug_report';
      case 'pr_reviewed': return 'rate_review';
      case 'commit': return 'code';
      case 'pr_merged': return 'merge_type';
      default: return 'activity_zone';
    }
  }

  getActivityTypeLabel(type: string): string {
    switch (type) {
      case 'bug_fixed': return 'Bug Fixed';
      case 'pr_reviewed': return 'PR Reviewed';
      case 'commit': return 'Commit';
      case 'pr_merged': return 'PR Merged';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  getBadgeIcon(category: string): string {
    switch (category) {
      case 'bug_squashing': return 'pest_control';
      case 'code_review': return 'rate_review';
      case 'streak': return 'local_fire_department';
      case 'milestone': return 'emoji_events';
      default: return 'military_tech';
    }
  }

  getProgressPercentage(current: number, target: number): number {
    return Math.min((current / target) * 100, 100);
  }
}
