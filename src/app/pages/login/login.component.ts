
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MaterialModule } from '../../shared/material.module';
import { AuthService } from '../../core/service/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loginForm: FormGroup = new FormGroup({});
  submitted = false;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      login: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  get form() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const credentials = {
      login: this.loginForm.get('login')?.value,
      password: this.loginForm.get('password')?.value
    };

    this.authService.login(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const returnUrl =
            this.route.snapshot.queryParamMap.get('returnUrl');

          // Only allow local application paths.
          const destination =
            returnUrl?.startsWith('/') &&
              !returnUrl.startsWith('//')
              ? returnUrl
              : '/';

          void this.router.navigateByUrl(destination);
        },
        error: (error) => {
          console.error('Login failed', error);

          this.loading = false;
          this.errorMessage =
            error.status === 400 || error.status === 401
              ? 'Invalid login or password.'
              : error.status === 0
                ? 'Unable to connect to the server.'
                : 'Login failed. Please try again.';
        }
      });
  }

  onReset(): void {
    this.submitted = false;
    this.errorMessage = '';
    this.loginForm.reset();
  }
}
