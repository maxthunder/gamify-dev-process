import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activity, UserStats } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  syncActivities(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/activities/sync`, {});
  }

  getActivities(limit?: number): Observable<Activity[]> {
    const params = limit ? { limit: limit.toString() } : {};
    return this.http.get<Activity[]>(`${this.apiUrl}/activities`, { params });
  }

  getUserStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/activities/stats`);
  }
}