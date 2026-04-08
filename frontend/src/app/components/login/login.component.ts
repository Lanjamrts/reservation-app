import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-card glass card">

        <!-- Onglets Sign In / Register -->
        <div class="tab-bar">
          <button class="tab-btn" [class.active]="activeTab() === 'login'" (click)="activeTab.set('login')">
            Sign In
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'register'" (click)="activeTab.set('register')">
            Register
          </button>
        </div>

        @if (activeTab() === 'login') {
          <h2 class="auth-title">Welcome Back</h2>
          <p class="auth-subtitle">Sign in to your account</p>

          @if (error()) {
            <div class="alert alert-error">{{ error() }}</div>
          }

          <form (ngSubmit)="onLogin()" #loginForm="ngForm" class="auth-form">
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" id="username" name="username" [(ngModel)]="username"
                required placeholder="Enter your username" class="form-control"
                [disabled]="isLoading()" />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" [(ngModel)]="password"
                required placeholder="••••••••" class="form-control"
                [disabled]="isLoading()" />
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg"
              [disabled]="isLoading() || loginForm.invalid">
              {{ isLoading() ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>
        }

        @if (activeTab() === 'register') {
          <h2 class="auth-title">Create Account</h2>
          <p class="auth-subtitle">Join Reserva today</p>

          @if (registerSuccess()) {
            <div class="alert alert-success">
              Account created! You can now sign in.
            </div>
          }

          @if (error()) {
            <div class="alert alert-error">{{ error() }}</div>
          }

          <form (ngSubmit)="onRegister()" #registerForm="ngForm" class="auth-form">
            <div class="form-group">
              <label for="reg-username">Username</label>
              <input type="text" id="reg-username" name="reg-username" [(ngModel)]="regUsername"
                required placeholder="Choose a username" class="form-control"
                [disabled]="isLoading()" />
            </div>
            <div class="form-group">
              <label for="reg-password">Password</label>
              <input type="password" id="reg-password" name="reg-password" [(ngModel)]="regPassword"
                required minlength="6" placeholder="At least 6 characters" class="form-control"
                [disabled]="isLoading()" />
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg"
              [disabled]="isLoading() || registerForm.invalid">
              {{ isLoading() ? 'Creating...' : 'Create Account' }}
            </button>
          </form>
        }

        <div class="auth-footer">
          <p>Demo credentials:</p>
          <div class="mock-users">
            <code>admin / admin123 (admin)</code>
            <code>alice / alice123 (user)</code>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: calc(100vh - 64px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: radial-gradient(circle at top right, var(--primary-light), transparent),
                  radial-gradient(circle at bottom left, var(--secondary-light), transparent);
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 40px 80px rgba(0, 0, 0, 0.1);
    }

    .tab-bar {
      display: flex;
      background: rgba(0,0,0,0.05);
      border-radius: 12px;
      padding: 4px;
      margin-bottom: 28px;
    }

    .tab-btn {
      flex: 1;
      padding: 10px;
      border: none;
      background: transparent;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.2s;
    }

    .tab-btn.active {
      background: white;
      color: var(--primary);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .auth-title {
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 8px;
      text-align: center;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .auth-subtitle {
      text-align: center;
      color: var(--text-secondary);
      margin-bottom: 28px;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .auth-footer {
      margin-top: 28px;
      text-align: center;
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    .mock-users {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
    }

    code {
      display: block;
      background: rgba(0,0,0,0.05);
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85rem;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);
  http = inject(HttpClient);

  activeTab = signal<'login' | 'register'>('login');

  // Login
  username = '';
  password = '';

  // Register
  regUsername = '';
  regPassword = '';

  isLoading = signal(false);
  error = signal<string | null>(null);
  registerSuccess = signal(false);

  onLogin() {
    this.isLoading.set(true);
    this.error.set(null);

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        const isAdmin = res.user.role === 'admin';
        this.router.navigate([isAdmin ? '/dashboard' : '/bookings']);
      },
      error: (err) => {
        this.error.set(err.message);
        this.isLoading.set(false);
      }
    });
  }

  onRegister() {
    this.isLoading.set(true);
    this.error.set(null);
    this.registerSuccess.set(false);

    this.http.post('http://localhost:3000/api/auth/register', {
      username: this.regUsername,
      password: this.regPassword,
      role: 'user'
    }).subscribe({
      next: () => {
        this.registerSuccess.set(true);
        this.isLoading.set(false);
        this.regUsername = '';
        this.regPassword = '';
        // Basculer vers Sign In après 1.5s
        setTimeout(() => this.activeTab.set('login'), 1500);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Registration failed.');
        this.isLoading.set(false);
      }
    });
  }
}