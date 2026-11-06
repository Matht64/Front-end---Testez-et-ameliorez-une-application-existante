import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { StudentService } from './student.service';
import { Student, StudentRequest } from '../models/Student';

describe('StudentService', () => {
  let service: StudentService;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:8080/api/students';

  const student: Student = {
    id: 1,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@test.com',
    age: 36,
  };

  const request: StudentRequest = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@test.com',
    age: 36,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(StudentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // Fails the test if a request was made but never matched by expectOne()
  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllStudents() sends GET /students and returns the list', () => {
    let result: Student[] | undefined;
    service.getAllStudents().subscribe((students) => (result = students));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([student]);

    expect(result).toEqual([student]);
  });

  it('getStudentById() sends GET /students/:id and returns the student', () => {
    let result: Student | undefined;
    service.getStudentById(1).subscribe((s) => (result = s));

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(student);

    expect(result).toEqual(student);
  });

  it('createStudent() sends POST /students with the request body', () => {
    let result: Student | undefined;
    service.createStudent(request).subscribe((s) => (result = s));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(student);

    expect(result).toEqual(student);
  });

  it('updateStudent() sends PUT /students/:id with the request body', () => {
    let result: Student | undefined;
    service.updateStudent(1, request).subscribe((s) => (result = s));

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(student);

    expect(result).toEqual(student);
  });

  it('deleteStudent() sends DELETE /students/:id and completes', () => {
    let completed = false;
    service.deleteStudent(1).subscribe({ complete: () => (completed = true) });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(completed).toBe(true);
  });

  it('propagates HTTP errors to the subscriber', () => {
    let status: number | undefined;
    service.getAllStudents().subscribe({ error: (e) => (status = e.status) });

    httpMock
      .expectOne(apiUrl)
      .flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
  });
});