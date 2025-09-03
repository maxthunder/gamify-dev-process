import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  formData = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    github_username: '',
    jira_account_id: ''
  };
  
  error = '';
  success = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (this.formData.password !== this.formData.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const registrationData = {
      username: this.formData.username,
      email: this.formData.email,
      password: this.formData.password,
      github_username: this.formData.github_username || undefined,
      jira_account_id: this.formData.jira_account_id || undefined
    };

    this.authService.register(registrationData).subscribe({
      next: () => {
        this.success = 'Account created successfully! Redirecting to dashboard...';
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.error || 'Registration failed. Please try again.';
        this.loading = false;
      }
    });
  }
}