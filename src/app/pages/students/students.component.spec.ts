import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { StudentsComponent } from './students.component';
import { StudentService } from '../../core/service/student.service';
import { AuthService } from '../../core/service/auth.service';
import { Student } from '../../core/models/Student';

describe('StudentsComponent', () => {
  let component: StudentsComponent;
  let fixture: ComponentFixture<StudentsComponent>;

  const studentServiceMock = {
    getAllStudents: jest.fn(),
    createStudent: jest.fn(),
    updateStudent: jest.fn(),
    deleteStudent: jest.fn(),
  };
  const authServiceMock = { logout: jest.fn() };

  const students: Student[] = [
    { id: 1, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@test.com', age: 36 },
    { id: 2, firstName: 'Alan', lastName: 'Turing', email: 'alan@test.com', age: 41 },
  ];

  const fillForm = (overrides: Record<string, unknown> = {}) =>
    component.studentForm.setValue({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@test.com',
      age: 30,
      ...overrides,
    });

  beforeEach(async () => {
    Object.values(studentServiceMock).forEach((fn) => fn.mockReset());
    authServiceMock.logout.mockReset();
    studentServiceMock.getAllStudents.mockReturnValue(of(students));

    await TestBed.configureTestingModule({
      imports: [StudentsComponent],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // runs ngOnInit -> loadStudents
  });

  afterEach(() => jest.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialisation', () => {
    it('builds the form with the four controls', () => {
      expect(Object.keys(component.form)).toEqual(['firstName', 'lastName', 'email', 'age']);
      expect(component.studentForm.invalid).toBe(true);
    });

    it('loads the students on init', () => {
      expect(studentServiceMock.getAllStudents).toHaveBeenCalledTimes(1);
      expect(component.students).toEqual(students);
      expect(component.loading).toBe(false);
      expect(component.errorMessage).toBe('');
    });
  });

  describe('loadStudents()', () => {
    it('sets loading while the request is pending', () => {
      studentServiceMock.getAllStudents.mockReturnValue(new Subject());
      component.loadStudents();
      expect(component.loading).toBe(true);
    });

    it('shows the fallback error and stops loading on failure', () => {
      studentServiceMock.getAllStudents.mockReturnValue(throwError(() => ({ status: 500 })));
      component.loadStudents();
      expect(component.loading).toBe(false);
      expect(component.errorMessage).toBe('Unable to load students.');
    });
  });

  describe('form validation', () => {
    it('requires firstName, lastName, email and age', () => {
      Object.values(component.form).forEach((control) =>
        expect(control.hasError('required')).toBe(true)
      );
    });

    it.each(['firstName', 'lastName'])('%s is limited to 100 characters', (field) => {
      component.form[field].setValue('a'.repeat(101));
      expect(component.form[field].hasError('maxlength')).toBe(true);

      component.form[field].setValue('a'.repeat(100));
      expect(component.form[field].hasError('maxlength')).toBe(false);
    });

    it('rejects a malformed email', () => {
      component.form['email'].setValue('not-an-email');
      expect(component.form['email'].hasError('email')).toBe(true);
    });

    it('rejects an age lower than 1', () => {
      component.form['age'].setValue(0);
      expect(component.form['age'].hasError('min')).toBe(true);
    });

    it('is valid with correct values', () => {
      fillForm();
      expect(component.studentForm.valid).toBe(true);
    });
  });

  describe('onSubmit() with an invalid form', () => {
    it('marks the form touched and does not call the API', () => {
      component.onSubmit();

      expect(component.submitted).toBe(true);
      expect(component.studentForm.touched).toBe(true);
      expect(studentServiceMock.createStudent).not.toHaveBeenCalled();
      expect(studentServiceMock.updateStudent).not.toHaveBeenCalled();
      expect(component.saving).toBe(false);
    });
  });

  describe('onSubmit() creating a student', () => {
    it('trims the text values and converts age to a number', () => {
      studentServiceMock.createStudent.mockReturnValue(new Subject());
      fillForm({
        firstName: '  Grace ',
        lastName: ' Hopper  ',
        email: 'grace@test.com',
        age: '30',
      });

      component.onSubmit();

      expect(studentServiceMock.createStudent).toHaveBeenCalledWith({
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@test.com',
        age: 30,
      });
      expect(component.saving).toBe(true);
    });

    it('appends the new student, shows a message and resets the form', () => {
      const created: Student = {
        id: 3, firstName: 'Grace', lastName: 'Hopper', email: 'grace@test.com', age: 30,
      };
      studentServiceMock.createStudent.mockReturnValue(of(created));
      fillForm();

      component.onSubmit();

      expect(component.students).toEqual([...students, created]);
      expect(component.successMessage).toBe('Student created successfully.');
      expect(component.saving).toBe(false);
      expect(component.submitted).toBe(false);
      expect(component.editingStudentId).toBeNull();
      expect(component.studentForm.value.firstName).toBeNull();
    });
  });

  describe('onSubmit() updating a student', () => {
    it('calls updateStudent and replaces the item in the list', () => {
      const updated: Student = { ...students[0], firstName: 'Augusta' };
      studentServiceMock.updateStudent.mockReturnValue(of(updated));

      component.editStudent(students[0]);
      component.studentForm.patchValue({ firstName: 'Augusta' });
      component.onSubmit();

      expect(studentServiceMock.createStudent).not.toHaveBeenCalled();
      expect(studentServiceMock.updateStudent).toHaveBeenCalledWith(1, {
        firstName: 'Augusta',
        lastName: 'Lovelace',
        email: 'ada@test.com',
        age: 36,
      });
      expect(component.students).toEqual([updated, students[1]]);
      expect(component.successMessage).toBe('Student updated successfully.');
      expect(component.editingStudentId).toBeNull();
    });
  });

  describe('onSubmit() error handling', () => {
    beforeEach(() => fillForm());

    it.each([
      [{ status: 401 }, 'Your session is not authenticated. Please log in again.'],
      [{ status: 403 }, 'You do not have permission to perform this action.'],
      [
        { status: 0 },
        'Cannot reach the server. Check that Spring Boot is running and CORS is configured.',
      ],
      [{ status: 400, error: { message: 'Email already used' } }, 'Email already used'],
      [{ status: 400, error: { detail: 'Invalid payload' } }, 'Invalid payload'],
      [{ status: 500 }, 'Unable to save the student.'],
    ])('maps %j to "%s"', (httpError, expected) => {
      studentServiceMock.createStudent.mockReturnValue(throwError(() => httpError));

      component.onSubmit();

      expect(component.errorMessage).toBe(expected);
      expect(component.saving).toBe(false);
      expect(component.students).toEqual(students); // list untouched
    });
  });

  describe('editStudent()', () => {
    it('enters edit mode, fills the form and clears messages', () => {
      component.successMessage = 'ok';
      component.errorMessage = 'ko';
      component.submitted = true;

      component.editStudent(students[1]);

      expect(component.editingStudentId).toBe(2);
      expect(component.studentForm.value).toEqual({
        firstName: 'Alan',
        lastName: 'Turing',
        email: 'alan@test.com',
        age: 41,
      });
      expect(component.submitted).toBe(false);
      expect(component.successMessage).toBe('');
      expect(component.errorMessage).toBe('');
    });
  });

  describe('deleteStudent()', () => {
    it('does nothing when the user cancels the confirmation', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      component.deleteStudent(students[0]);

      expect(studentServiceMock.deleteStudent).not.toHaveBeenCalled();
      expect(component.students).toEqual(students);
    });

    it('asks for confirmation using the student name', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      component.deleteStudent(students[0]);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to delete Ada Lovelace?'
      );
    });

    it('removes the student from the list and shows a message when confirmed', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      studentServiceMock.deleteStudent.mockReturnValue(of(void 0));

      component.deleteStudent(students[0]);

      expect(studentServiceMock.deleteStudent).toHaveBeenCalledWith(1);
      expect(component.students).toEqual([students[1]]);
      expect(component.successMessage).toBe('Student deleted successfully.');
    });

    it('resets the form if the deleted student was being edited', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      studentServiceMock.deleteStudent.mockReturnValue(of(void 0));
      component.editStudent(students[0]);

      component.deleteStudent(students[0]);

      expect(component.editingStudentId).toBeNull();
    });

    it('keeps the form in edit mode if another student was deleted', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      studentServiceMock.deleteStudent.mockReturnValue(of(void 0));
      component.editStudent(students[0]);

      component.deleteStudent(students[1]);

      expect(component.editingStudentId).toBe(1);
    });

    it('shows an error and keeps the list when the API fails', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      studentServiceMock.deleteStudent.mockReturnValue(
        throwError(() => ({ status: 403 }))
      );

      component.deleteStudent(students[0]);

      expect(component.errorMessage).toBe(
        'You do not have permission to perform this action.'
      );
      expect(component.students).toEqual(students);
    });

    it('uses the fallback message for unknown delete errors', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      studentServiceMock.deleteStudent.mockReturnValue(
        throwError(() => ({ status: 500 }))
      );

      component.deleteStudent(students[0]);

      expect(component.errorMessage).toBe('Unable to delete the student.');
    });
  });

  describe('resetForm()', () => {
    it('clears the form, submitted flag and editing id', () => {
      component.editStudent(students[0]);
      component.submitted = true;

      component.resetForm();

      expect(component.studentForm.value.firstName).toBeNull();
      expect(component.submitted).toBe(false);
      expect(component.editingStudentId).toBeNull();
    });
  });

  describe('logout()', () => {
    it('delegates to AuthService.logout', () => {
      component.logout();
      expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscription cleanup', () => {
    it('unsubscribes from a pending save when the component is destroyed', () => {
      const request$ = new Subject<Student>();
      studentServiceMock.createStudent.mockReturnValue(request$);
      fillForm();

      component.onSubmit();
      expect(request$.observed).toBe(true);

      fixture.destroy();
      expect(request$.observed).toBe(false);
    });
  });
});