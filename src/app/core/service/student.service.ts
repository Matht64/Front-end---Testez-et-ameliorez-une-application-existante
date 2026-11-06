
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student, StudentRequest } from '../models/Student';




@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private readonly http = inject(HttpClient);

  // Change this URL if your Spring Boot server uses another port.
  private readonly apiUrl = 'http://localhost:8080/api/students';

  getAllStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(this.apiUrl);
  }

  getStudentById(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/${id}`);
  }

  createStudent(request: StudentRequest): Observable<Student> {
    return this.http.post<Student>(this.apiUrl, request);
  }

  updateStudent(
    id: number,
    request: StudentRequest
  ): Observable<Student> {
    return this.http.put<Student>(`${this.apiUrl}/${id}`, request);
  }

  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
