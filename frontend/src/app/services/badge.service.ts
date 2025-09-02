import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Badge } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BadgeService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getUserBadges(): Observable<Badge[]> {
    return this.http.get<Badge[]>(`${this.apiUrl}/badges`);
  }

  getBadgeProgress(): Observable<Badge[]> {
    return this.http.get<Badge[]>(`${this.apiUrl}/badges/progress`);
  }

  checkBadges(): Observable<{ newBadges: Badge[] }> {
    return this.http.post<{ newBadges: Badge[] }>(`${this.apiUrl}/badges/check`, {});
  }
}