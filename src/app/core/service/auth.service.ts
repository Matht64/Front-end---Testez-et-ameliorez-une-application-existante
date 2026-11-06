import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Register } from '../models/Register';

export interface LoginRequest {
  login: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly apiUrl = 'http://localhost:8080/api';
  private readonly tokenKey = 'token';

  register(user: Register): Observable<Object> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  login(credentials: LoginRequest): Observable<string> {
    return this.http
      .post(`${this.apiUrl}/login`, credentials, {
        responseType: 'text'
      })
      .pipe(
        tap((token: string) => {
          const jwt = token.trim();

          if (!jwt) {
            throw new Error('The login response contains no JWT.');
          }

          localStorage.setItem(this.tokenKey, jwt);
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    try {
      const parts = token.split('.');

      if (parts.length !== 3) {
        this.clearToken();
        return false;
      }

      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const decoded = atob(
        payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')
      );

      const claims = JSON.parse(decoded);

      if (
        typeof claims.exp !== 'number' ||
        claims.exp * 1000 <= Date.now()
      ) {
        this.clearToken();
        return false;
      }

      return true;
    } catch {
      this.clearToken();
      return false;
    }
  }

  private clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  logout(): void {
    this.clearToken();
    void this.router.navigate(['/login']);
  }
}