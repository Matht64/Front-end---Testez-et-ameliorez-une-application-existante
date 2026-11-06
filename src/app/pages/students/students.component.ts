
import {
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StudentService } from '../../core/service/student.service';
import { Student, StudentRequest } from '../../core/models/Student';
import { AuthService } from '../../core/service/auth.service';


@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './students.component.html',
  styleUrl: './students.component.css'
})
export class StudentsComponent implements OnInit {
  private readonly studentService = inject(StudentService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  students: Student[] = [];
  studentForm: FormGroup = new FormGroup({});

  loading = false;
  saving = false;
  submitted = false;

  editingStudentId: number | null = null;

  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.studentForm = this.formBuilder.group({
      firstName: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ],
      lastName: [
        '',
        [Validators.required, Validators.maxLength(100)]
      ],
      email: [
        '',
        [Validators.required, Validators.email]
      ],
      age: [
        null,
        [Validators.required, Validators.min(1)]
      ]
    });

    this.loadStudents();
  }

  get form() {
    return this.studentForm.controls;
  }

  loadStudents(): void {
    this.loading = true;
    this.errorMessage = '';

    this.studentService.getAllStudents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (students) => {
          this.students = students;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage =
            this.getErrorMessage(error, 'Unable to load students.');
        }
      });
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    const request: StudentRequest = {
      firstName: this.studentForm.value.firstName.trim(),
      lastName: this.studentForm.value.lastName.trim(),
      email: this.studentForm.value.email.trim(),
      age: Number(this.studentForm.value.age)
    };

    this.saving = true;

    const request$ = this.editingStudentId === null
      ? this.studentService.createStudent(request)
      : this.studentService.updateStudent(
        this.editingStudentId,
        request
      );

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (student) => {
          const isEditing = this.editingStudentId !== null;

          if (isEditing) {
            this.students = this.students.map((item) =>
              item.id === student.id ? student : item
            );
          } else {
            this.students = [...this.students, student];
          }

          this.successMessage = isEditing
            ? 'Student updated successfully.'
            : 'Student created successfully.';

          this.saving = false;
          this.resetForm();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to save the student.'
          );
        }
      });
  }

  editStudent(student: Student): void {
    this.editingStudentId = student.id;
    this.submitted = false;
    this.successMessage = '';
    this.errorMessage = '';

    this.studentForm.patchValue({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      age: student.age
    });
  }

  deleteStudent(student: Student): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.firstName} ${student.lastName}?`
    );

    if (!confirmed) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    this.studentService.deleteStudent(student.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.students = this.students.filter(
            (item) => item.id !== student.id
          );

          this.successMessage = 'Student deleted successfully.';

          if (this.editingStudentId === student.id) {
            this.resetForm();
          }
        },
        error: (error) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Unable to delete the student.'
          );
        }
      });
  }

  resetForm(): void {
    this.studentForm.reset();
    this.submitted = false;
    this.editingStudentId = null;
  }

  private getErrorMessage(
    error: unknown,
    fallback: string
  ): string {
    const httpError = error as {
      status?: number;
      error?: { message?: string; detail?: string };
    };

    if (httpError.status === 401) {
      return 'Your session is not authenticated. Please log in again.';
    }

    if (httpError.status === 403) {
      return 'You do not have permission to perform this action.';
    }

    if (httpError.status === 0) {
      return 'Cannot reach the server. Check that Spring Boot is running and CORS is configured.';
    }

    return httpError.error?.message
      ?? httpError.error?.detail
      ?? fallback;
  }
  
  logout(): void {
    this.authService.logout();
  }
}
