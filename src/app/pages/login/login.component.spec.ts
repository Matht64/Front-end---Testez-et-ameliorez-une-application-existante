import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../core/service/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;

  // Mocks
  const authServiceMock = { login: jest.fn() };
  let returnUrl: string | null;
  const routeMock = {
    snapshot: {
      queryParamMap: { get: jest.fn(() => returnUrl) },
    },
  };

  const fillForm = (login = 'john', password = 'secret') =>
    component.loginForm.setValue({ login, password });

  beforeEach(async () => {
    returnUrl = null;
    authServiceMock.login.mockReset();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ActivatedRoute, useValue: routeMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // runs ngOnInit
  });

  afterEach(() => jest.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialisation', () => {
    it('builds the form with empty login and password controls', () => {
      expect(component.loginForm.value).toEqual({ login: '', password: '' });
      expect(component.form['login']).toBeDefined();
      expect(component.form['password']).toBeDefined();
    });

    it('starts invalid, not submitted, not loading, without error', () => {
      expect(component.loginForm.invalid).toBe(true);
      expect(component.submitted).toBe(false);
      expect(component.loading).toBe(false);
      expect(component.errorMessage).toBe('');
    });
  });

  describe('form validation', () => {
    it('requires login', () => {
      component.form['password'].setValue('secret');
      expect(component.form['login'].hasError('required')).toBe(true);
    });

    it('requires password', () => {
      component.form['login'].setValue('john');
      expect(component.form['password'].hasError('required')).toBe(true);
    });

    it('is valid when both fields are filled', () => {
      fillForm();
      expect(component.loginForm.valid).toBe(true);
    });
  });

  describe('onSubmit() with an invalid form', () => {
    it('marks the form as submitted and touched, and does not call the API', () => {
      component.onSubmit();

      expect(component.submitted).toBe(true);
      expect(component.loginForm.touched).toBe(true);
      expect(component.loading).toBe(false);
      expect(authServiceMock.login).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit() with a valid form', () => {
    it('calls AuthService.login with the form credentials', () => {
      authServiceMock.login.mockReturnValue(of({}));
      fillForm('john', 'secret');

      component.onSubmit();

      expect(authServiceMock.login).toHaveBeenCalledWith({
        login: 'john',
        password: 'secret',
      });
    });

    it('sets loading to true while the request is pending', () => {
      authServiceMock.login.mockReturnValue(new Subject()); // never emits
      fillForm();

      component.onSubmit();

      expect(component.loading).toBe(true);
    });

    it('clears a previous error message when resubmitting', () => {
      authServiceMock.login.mockReturnValue(new Subject());
      component.errorMessage = 'Old error';
      fillForm();

      component.onSubmit();

      expect(component.errorMessage).toBe('');
    });
  });

  describe('successful login redirect', () => {
    beforeEach(() => {
      authServiceMock.login.mockReturnValue(of({}));
      fillForm();
    });

    it('navigates to "/" when there is no returnUrl', () => {
      component.onSubmit();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('navigates to a local returnUrl', () => {
      returnUrl = '/dashboard?tab=1';
      component.onSubmit();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard?tab=1');
    });

    // Open-redirect protection
    it.each(['//evil.com', 'https://evil.com', 'javascript:alert(1)', 'dashboard'])(
      'ignores the unsafe returnUrl "%s" and goes to "/"',
      (unsafe) => {
        returnUrl = unsafe;
        component.onSubmit();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/');
      }
    );
  });

  describe('failed login', () => {
    beforeEach(() => fillForm());

    it.each([
      [401, 'Invalid login or password.'],
      [0, 'Unable to connect to the server.'],
      [500, 'Login failed. Please try again.'],
    ])('status %i shows "%s" and stops loading', (status, message) => {
      authServiceMock.login.mockReturnValue(throwError(() => ({ status })));

      component.onSubmit();

      expect(component.errorMessage).toBe(message);
      expect(component.loading).toBe(false);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('subscription cleanup', () => {
    it('unsubscribes from the login request when the component is destroyed', () => {
      const login$ = new Subject<unknown>();
      authServiceMock.login.mockReturnValue(login$);
      fillForm();

      component.onSubmit();
      expect(login$.observed).toBe(true);

      fixture.destroy();
      expect(login$.observed).toBe(false);
    });
  });

  describe('onReset()', () => {
    it('clears the form, submitted flag and error message', () => {
      fillForm();
      component.submitted = true;
      component.errorMessage = 'Some error';

      component.onReset();

      expect(component.loginForm.value).toEqual({ login: null, password: null });
      expect(component.submitted).toBe(false);
      expect(component.errorMessage).toBe('');
    });
  });
});