import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { Register } from '../models/Register';

/** Builds a fake JWT. Only the payload matters to AuthService. */
function toBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(payload: object): string {
  return `${toBase64Url('{"alg":"HS256"}')}.${toBase64Url(JSON.stringify(payload))}.signature`;
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;
const oneHourAgo = () => Math.floor(Date.now() / 1000) - 3600;

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const apiUrl = 'http://localhost:8080/api';
  const tokenKey = 'token';

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('register()', () => {
    it('sends POST /register with the user', () => {
      const user: Register = {
        firstName: 'Ada',
        lastName: 'Lovelace',
        login: 'ada',
        password: 'secret',
      };
      let responded = false;
      service.register(user).subscribe(() => (responded = true));

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(user);
      req.flush({});

      expect(responded).toBe(true);
    });
  });

  describe('login()', () => {
    const credentials = { login: 'ada', password: 'secret' };

    it('sends POST /login expecting a text response', () => {
      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      expect(req.request.responseType).toBe('text');
      req.flush('a.b.c');
    });

    it('stores the trimmed token in localStorage', () => {
      service.login(credentials).subscribe();

      httpMock.expectOne(`${apiUrl}/login`).flush('  a.b.c \n');

      expect(localStorage.getItem(tokenKey)).toBe('a.b.c');
    });

    it.each(['', '   ', '\n'])(
      'errors and stores nothing when the response is %j',
      (body) => {
        let error: Error | undefined;
        service.login(credentials).subscribe({ error: (e) => (error = e) });

        httpMock.expectOne(`${apiUrl}/login`).flush(body);

        expect(error?.message).toBe('The login response contains no JWT.');
        expect(localStorage.getItem(tokenKey)).toBeNull();
      }
    );

    it('propagates HTTP errors and stores nothing', () => {
      let status: number | undefined;
      service.login(credentials).subscribe({ error: (e) => (status = e.status) });

      httpMock
        .expectOne(`${apiUrl}/login`)
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(status).toBe(401);
      expect(localStorage.getItem(tokenKey)).toBeNull();
    });
  });

  describe('getToken()', () => {
    it('returns null when no token is stored', () => {
      expect(service.getToken()).toBeNull();
    });

    it('returns the stored token', () => {
      localStorage.setItem(tokenKey, 'a.b.c');
      expect(service.getToken()).toBe('a.b.c');
    });
  });

  describe('isAuthenticated()', () => {
    it('is false when there is no token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('is true for a well-formed, unexpired token', () => {
      localStorage.setItem(tokenKey, makeJwt({ exp: inOneHour() }));

      expect(service.isAuthenticated()).toBe(true);
      expect(localStorage.getItem(tokenKey)).not.toBeNull();
    });

    it('handles base64url characters (- and _) and missing padding', () => {
      // These payloads produce "+" and "/" in standard base64
      const claims = { exp: inOneHour(), a: '>'.repeat(12), b: '?'.repeat(12) };
      expect(btoa(JSON.stringify(claims))).toMatch(/[+/]/);

      localStorage.setItem(tokenKey, makeJwt(claims));

      expect(service.isAuthenticated()).toBe(true);
    });

    it('is false and clears the token when it is expired', () => {
      localStorage.setItem(tokenKey, makeJwt({ exp: oneHourAgo() }));

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(tokenKey)).toBeNull();
    });

    it('treats a token expiring exactly now as expired', () => {
      jest.useFakeTimers().setSystemTime(new Date('2030-01-01T00:00:00Z'));
      const exp = Date.now() / 1000;
      localStorage.setItem(tokenKey, makeJwt({ exp }));

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(tokenKey)).toBeNull();
    });

    it.each([
      ['has no exp claim', {}],
      ['has a non-numeric exp claim', { exp: 'tomorrow' }],
    ])('is false and clears the token when it %s', (_label, claims) => {
      localStorage.setItem(tokenKey, makeJwt(claims));

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(tokenKey)).toBeNull();
    });

    it.each(['not-a-jwt', 'only.two', 'a.b.c.d'])(
      'is false and clears the token when it has the wrong shape (%s)',
      (token) => {
        localStorage.setItem(tokenKey, token);

        expect(service.isAuthenticated()).toBe(false);
        expect(localStorage.getItem(tokenKey)).toBeNull();
      }
    );

    it('is false and clears the token when the payload is not valid JSON', () => {
      localStorage.setItem(tokenKey, `h.${toBase64Url('not json')}.s`);

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(tokenKey)).toBeNull();
    });

    it('is false and clears the token when the payload is not valid base64', () => {
      localStorage.setItem(tokenKey, 'h.@@@@.s');

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(tokenKey)).toBeNull();
    });
  });

  describe('logout()', () => {
    it('removes the token and navigates to /login', () => {
      localStorage.setItem(tokenKey, 'a.b.c');

      service.logout();

      expect(localStorage.getItem(tokenKey)).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});