import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="container navbar-container">
        <a routerLink="/" class="logo">
          <!-- ✅ Icône SVG propre — pas d'emoji -->
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <circle cx="8"  cy="14" r="1" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/>
            <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>
          </svg>
          <span class="logo-text">Reserva</span>
        </a>

        <!-- Date dynamique -->
        <div class="live-date">{{ currentDate }}</div>

        <div class="nav-links">
          @if (authService.isLoggedIn()) {
            @if (authService.isAdmin()) {
              <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">Admin Panel</a>
            }
            <a routerLink="/bookings" routerLinkActive="active" class="nav-link">My Bookings</a>
            <div class="user-menu">
              <span class="username">{{ authService.currentUser()?.username }}</span>
              <button (click)="logout()" class="btn btn-outline btn-sm">Logout</button>
            </div>
          } @else {
            <a routerLink="/login" class="btn btn-primary btn-sm">Sign In</a>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.3);
      position: sticky;
      top: 0;
      z-index: 1000;
      height: 64px;
      display: flex;
      align-items: center;
    }

    .navbar-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--primary);
      font-weight: 700;
      font-size: 1.25rem;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      color: var(--primary);
    }

    .logo-text { color: var(--text-primary); }

    .live-date {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      background: rgba(0,0,0,0.04);
      padding: 4px 14px;
      border-radius: 20px;
      border: 1px solid var(--border);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .nav-link {
      text-decoration: none;
      color: var(--text-secondary);
      font-weight: 500;
      transition: color 0.2s;
      position: relative;
    }

    .nav-link:hover, .nav-link.active { color: var(--primary); }

    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 100%;
      height: 2px;
      background: var(--primary);
      border-radius: 2px;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-left: 12px;
      border-left: 1px solid var(--border);
    }

    .username {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.9rem;
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  currentDate = '';
  private timer: any;

  ngOnInit() {
    this.updateDate();
    this.timer = setInterval(() => this.updateDate(), 60000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private updateDate() {
    this.currentDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  logout() {
    this.authService.logout();
  }
}