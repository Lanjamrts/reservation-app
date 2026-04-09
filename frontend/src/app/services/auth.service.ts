import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/api/auth`;

  // Reactive signal for current user state
  currentUser = signal<AuthUser | null>(this.loadUserFromStorage());

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/login`, { username, password })
      .pipe(
        tap((response) => {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('current_user', JSON.stringify(response.user));
          this.currentUser.set(response.user);
        }),
        catchError((err) => {
          const message =
            err.error?.message || 'Login failed. Check your credentials.';
          return throwError(() => new Error(message));
        }),
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUser();
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  getMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.API_URL}/me`);
  }

  private loadUserFromStorage(): AuthUser | null {
    const stored = localStorage.getItem('current_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      return null;
    }
  }
}