import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { BadgeService } from '../../services/badge.service';
import { Badge } from '../../models';

@Component({
  selector: 'app-badges',
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatChipsModule
  ],
  templateUrl: './badges.html',
  styleUrl: './badges.scss'
})
export class Badges implements OnInit {
  earnedBadges: Badge[] = [];
  availableBadges: Badge[] = [];
  loading = true;
  checking = false;

  constructor(private badgeService: BadgeService) {}

  ngOnInit() {
    this.loadBadges();
  }

  loadBadges() {
    this.loading = true;
    
    Promise.all([
      this.badgeService.getUserBadges().toPromise(),
      this.badgeService.getBadgeProgress().toPromise()
    ]).then(([earned, available]) => {
      this.earnedBadges = earned || [];
      this.availableBadges = available || [];
      this.loading = false;
    }).catch(error => {
      console.error('Error loading badges:', error);
      this.loading = false;
    });
  }

  checkForNewBadges() {
    this.checking = true;
    this.badgeService.checkBadges().subscribe({
      next: (result) => {
        this.checking = false;
        if (result.newBadges.length > 0) {
          console.log('New badges earned:', result.newBadges);
          this.loadBadges(); // Reload to show new badges
        } else {
          console.log('No new badges earned');
        }
      },
      error: (error) => {
        console.error('Error checking badges:', error);
        this.checking = false;
      }
    });
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

  getCategoryColor(category: string): string {
    switch (category) {
      case 'bug_squashing': return '#f44336'; // red
      case 'code_review': return '#2196f3'; // blue
      case 'streak': return '#ff5722'; // deep orange
      case 'milestone': return '#4caf50'; // green
      default: return '#9c27b0'; // purple
    }
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'bug_squashing': return 'Bug Squashing';
      case 'code_review': return 'Code Review';
      case 'streak': return 'Streak';
      case 'milestone': return 'Milestone';
      default: return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  getProgressPercentage(current: number, target: number): number {
    return Math.min((current / target) * 100, 100);
  }

  getBadgesByCategory(badges: Badge[]): { [key: string]: Badge[] } {
    return badges.reduce((acc, badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = [];
      }
      acc[badge.category].push(badge);
      return acc;
    }, {} as { [key: string]: Badge[] });
  }

  getCategories(): string[] {
    const allBadges = [...this.earnedBadges, ...this.availableBadges];
    const categories = new Set(allBadges.map(badge => badge.category));
    return Array.from(categories);
  }
}
