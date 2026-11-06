import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { RegisterComponent } from './register.component';
import { AuthService } from '../../core/service/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let router: Router;

  const authServiceMock = { register: jest.fn() };

  const validUser = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    login: 'ada',
    password: 'secret',
  };

  const fillForm = (values = validUser) => component.registerForm.setValue(values);

  beforeEach(async () => {
    authServiceMock.register.mockReset();

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
    jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // runs ngOnInit
  });

  afterEach(() => jest.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialisation', () => {
    it('builds the form with firstName, lastName, login and password', () => {
      expect(Object.keys(component.form)).toEqual([
        'firstName',
        'lastName',
        'login',
        'password',
      ]);
      expect(component.registerForm.invalid).toBe(true);
    });

    it('starts not submitted, not loading, without error', () => {
      expect(component.submitted).toBe(false);
      expect(component.loading).toBe(false);
      expect(component.errorMessage).toBe('');
    });
  });

  describe('form validation', () => {
    it.each(['firstName', 'lastName', 'login', 'password'])(
      '%s is required',
      (field) => {
        expect(component.form[field].hasError('required')).toBe(true);
      }
    );

    it('is valid when every field is filled', () => {
      fillForm();
      expect(component.registerForm.valid).toBe(true);
    });

    it.each(['firstName', 'lastName', 'login', 'password'])(
      'is invalid when only %s is empty',
      (field) => {
        fillForm({ ...validUser, [field]: '' });
        expect(component.registerForm.invalid).toBe(true);
      }
    );
  });

  describe('onSubmit() with an invalid form', () => {
    it('marks the form touched and does not call the API', () => {
      component.onSubmit();

      expect(component.submitted).toBe(true);
      expect(component.registerForm.touched).toBe(true);
      expect(component.loading).toBe(false);
      expect(authServiceMock.register).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit() with a valid form', () => {
    it('calls AuthService.register with the form values', () => {
      authServiceMock.register.mockReturnValue(of({}));
      fillForm();

      component.onSubmit();

      expect(authServiceMock.register).toHaveBeenCalledWith(validUser);
    });

    it('sets loading to true while the request is pending', () => {
      authServiceMock.register.mockReturnValue(new Subject());
      fillForm();

      component.onSubmit();

      expect(component.loading).toBe(true);
    });

    it('clears a previous error message', () => {
      authServiceMock.register.mockReturnValue(new Subject());
      component.errorMessage = 'Old error';
      fillForm();

      component.onSubmit();

      expect(component.errorMessage).toBe('');
    });
  });

  describe('successful registration', () => {
    it('alerts the user and navigates to /login', () => {
      authServiceMock.register.mockReturnValue(of({}));
      fillForm();

      component.onSubmit();

      expect(window.alert).toHaveBeenCalledWith('Registration successful!');
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('failed registration', () => {
    beforeEach(() => fillForm());

    it.each([
      [0, 'Unable to connect to the server.'],
      [409, 'This login is already taken.'],
      [500, 'Registration failed. Please try again.'],
    ])('status %i shows "%s" and stops loading', (status, message) => {
      authServiceMock.register.mockReturnValue(throwError(() => ({ status })));

      component.onSubmit();

      expect(component.errorMessage).toBe(message);
      expect(component.loading).toBe(false);
      expect(window.alert).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('subscription cleanup', () => {
    it('unsubscribes from a pending request when the component is destroyed', () => {
      const register$ = new Subject<unknown>();
      authServiceMock.register.mockReturnValue(register$);
      fillForm();

      component.onSubmit();
      expect(register$.observed).toBe(true);

      fixture.destroy();
      expect(register$.observed).toBe(false);
    });
  });

  describe('onReset()', () => {
    it('clears the form, submitted flag and error message', () => {
      fillForm();
      component.submitted = true;
      component.errorMessage = 'Some error';

      component.onReset();

      expect(component.registerForm.value).toEqual({
        firstName: null,
        lastName: null,
        login: null,
        password: null,
      });
      expect(component.submitted).toBe(false);
      expect(component.errorMessage).toBe('');
    });
  });
});