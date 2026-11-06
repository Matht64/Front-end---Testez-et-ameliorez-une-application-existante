import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { jwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../service/auth.service';

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  const authServiceMock = { getToken: jest.fn() };
  const apiUrl = 'http://localhost:8080/api/students';

  beforeEach(() => {
    authServiceMock.getToken.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds the Bearer token to requests sent to the API', () => {
    authServiceMock.getToken.mockReturnValue('my.jwt.token');

    http.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my.jwt.token');
    req.flush([]);
  });

  it('keeps the original method and body when adding the header', () => {
    authServiceMock.getToken.mockReturnValue('my.jwt.token');
    const body = { firstName: 'Ada' };

    http.post(apiUrl, body).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my.jwt.token');
    req.flush({});
  });

  it.each([null, ''])(
    'does not add an Authorization header when the token is %j',
    (token) => {
      authServiceMock.getToken.mockReturnValue(token);

      http.get(apiUrl).subscribe();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([]);
    }
  );

  // The token must never leak to third-party or non-API URLs
  it.each([
    'https://other-site.com/api/students',
    'http://localhost:4200/assets/data.json',
    'http://localhost:8080/apiary',
  ])('does not add the token to the non-API URL %s', (url) => {
    authServiceMock.getToken.mockReturnValue('my.jwt.token');

    http.get(url).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});