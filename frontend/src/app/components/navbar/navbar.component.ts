import {
  Component, inject, OnInit, OnDestroy,
  signal, HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar" [class.scrolled]="isScrolled()" [class.menu-open]="menuOpen()">

      <!-- Progress bar — scroll indicator -->
      <div class="nav-progress" [style.width.%]="scrollProgress()"></div>

      <div class="container navbar-inner">

        <!-- Logo -->
        <a routerLink="/" class="nav-logo" (click)="menuOpen.set(false)">
          <div class="logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/>
              <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="8" cy="14" r="1.2" fill="currentColor"/>
              <circle cx="12" cy="14" r="1.2" fill="currentColor"/>
              <circle cx="16" cy="14" r="1.2" fill="currentColor"/>
            </svg>
          </div>
          <span class="logo-text">Reserva</span>
          <span class="logo-version">v3</span>
        </a>

        <!-- Center — nav links (desktop) -->
        <div class="nav-links" [class.open]="menuOpen()">

          <!-- Mobile header inside menu -->
          <div class="mobile-menu-header">
            <span class="logo-text">Reserva</span>
            <button class="menu-close-btn" (click)="menuOpen.set(false)" aria-label="Fermer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          @if (authService.isLoggedIn()) {

            @if (authService.isAdmin()) {
              <a routerLink="/dashboard" routerLinkActive="active"
                 class="nav-link" (click)="menuOpen.set(false)">
                <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
                Admin
                <span class="nav-badge">Admin</span>
              </a>
            }

            <a routerLink="/bookings" routerLinkActive="active"
               class="nav-link" (click)="menuOpen.set(false)">
              <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
              </svg>
              Réservations
            </a>

          } @else {
            <a routerLink="/login" class="nav-link" routerLinkActive="active" (click)="menuOpen.set(false)">Connexion</a>
          }

          <!-- Mobile: date + logout inline -->
          <div class="mobile-extras">
            <div class="mobile-date">{{ currentDate() }}</div>
            @if (authService.isLoggedIn()) {
              <button (click)="logout()" class="btn btn-outline btn-sm w-full">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                Déconnexion
              </button>
            }
          </div>
        </div>

        <!-- Right side -->
        <div class="nav-right">

          <!-- Live clock -->
          <div class="nav-clock" aria-label="Heure actuelle">
            <div class="clock-dot"></div>
            {{ currentTime() }}
          </div>

          @if (authService.isLoggedIn()) {

            <!-- Notification bell -->
            <button class="icon-btn" aria-label="Notifications">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span class="notif-dot" aria-hidden="true"></span>
            </button>

            <!-- Theme toggle -->
            <button class="icon-btn theme-toggle-btn" (click)="themeService.toggleTheme()" [attr.aria-label]="themeService.isLightTheme() ? 'Activer le mode sombre' : 'Activer le mode clair'" title="Basculer thème">
              @if (themeService.isLightTheme()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/>
                </svg>
              }
            </button>

            <!-- Avatar menu -->
            <div class="avatar-wrapper" (click)="toggleAvatarMenu()">
              <div class="avatar" [class.ring]="avatarMenuOpen()">
                {{ userInitials() }}
              </div>
              <div class="avatar-chevron" [class.rotated]="avatarMenuOpen()">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              <!-- Dropdown -->
              @if (avatarMenuOpen()) {
                <div class="avatar-menu animate-in" (click)="$event.stopPropagation()">
                  <div class="avatar-menu-header">
                    <div class="avatar-menu-avatar">{{ userInitials() }}</div>
                    <div>
                      <div class="avatar-menu-name">{{ authService.currentUser()?.username }}</div>
                      <div class="avatar-menu-role">
                        @if (authService.isAdmin()) {
                          <span class="badge badge-brand">Admin</span>
                        } @else {
                          <span class="badge badge-neutral">Utilisateur</span>
                        }
                      </div>
                    </div>
                  </div>
                  <div class="avatar-menu-divider"></div>
                  <a routerLink="/bookings" class="avatar-menu-item" (click)="avatarMenuOpen.set(false)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                    Mes réservations
                  </a>
                  <a routerLink="/profile" class="avatar-menu-item" (click)="avatarMenuOpen.set(false)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Mon profil
                  </a>
                  @if (authService.isAdmin()) {
                    <a routerLink="/dashboard" class="avatar-menu-item" (click)="avatarMenuOpen.set(false)">
                      <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2H3V4zM3 9h6v8H4a1 1 0 01-1-1V9zm8 0h6v7a1 1 0 01-1 1h-5V9z"/></svg>
                      Back-office
                    </a>
                  }
                  <div class="avatar-menu-divider"></div>
                  <button class="avatar-menu-item danger" (click)="logout()">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Déconnexion
                  </button>
                </div>
              }
            </div>

          } @else {
            <a routerLink="/login" class="btn btn-brand btn-sm">
              Connexion
            </a>
          }

          <!-- Hamburger — mobile only -->
          <button class="hamburger" (click)="menuOpen.set(!menuOpen())"
            [class.active]="menuOpen()" aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Overlay for mobile menu & avatar dropdown -->
    @if (menuOpen() || avatarMenuOpen()) {
      <div class="nav-backdrop"
        [class.visible]="menuOpen() || avatarMenuOpen()"
        (click)="closeAll()">
      </div>
    }
  `,
  styles: [`
    /* ====================================================
       NAVBAR SHELL
    ==================================================== */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 100;
      height: 64px;
      display: flex;
      align-items: center;
      background: rgba(10, 9, 16, 0.7);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-bottom: 1px solid rgba(139, 92, 246, 0.1);
      transition: all 0.3s ease;
      overflow: visible;
    }

    .navbar.scrolled {
      background: rgba(10, 9, 16, 0.95);
      border-bottom-color: rgba(139, 92, 246, 0.2);
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    }

    /* Scroll progress bar */
    .nav-progress {
      position: absolute;
      top: 0;
      left: 0;
      height: 2px;
      background: var(--gradient-aurora);
      transition: width 0.1s linear;
      box-shadow: 0 0 10px var(--secondary-glow);
      border-radius: 0 2px 2px 0;
    }

    /* ====================================================
       INNER LAYOUT
    ==================================================== */
    .navbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      height: 100%;
      position: relative;
    }

    /* ====================================================
       LOGO
    ==================================================== */
    .nav-logo {
      display: flex;
      align-items: center;
      gap: 9px;
      text-decoration: none;
      flex-shrink: 0;
      transition: opacity 0.2s;
    }

    .nav-logo:hover { opacity: 0.85; }

    .logo-mark {
      width: 36px; height: 36px;
      background: var(--gradient-aurora);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 15px var(--secondary-glow);
      flex-shrink: 0;
    }

    .logo-text {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.03em;
    }

    .logo-version {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.04em;
    }

    /* ====================================================
       NAV LINKS — desktop
    ==================================================== */
    .nav-links {
      display: flex;
      align-items: center;
      gap: 2px;
      flex: 1;
      justify-content: center;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: var(--radius-sm);
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      position: relative;
      white-space: nowrap;
    }

    .nav-link:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.05);
    }

    .nav-link.active {
      color: var(--brand);
      background: var(--brand-subtle);
    }

    .nav-link-icon {
      width: 15px; height: 15px;
      flex-shrink: 0;
      opacity: 0.75;
    }

    .nav-badge {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--secondary-subtle);
      color: var(--secondary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border: 1px solid var(--secondary-glow);
    }

    /* ====================================================
       RIGHT SIDE
    ==================================================== */
    .nav-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* Live clock */
    .nav-clock {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      padding: 5px 12px;
      border-radius: var(--radius-full);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
    }

    .clock-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success-bg);
      animation: pulseDot 2s ease-in-out infinite;
      flex-shrink: 0;
    }

    /* Icon button */
    .icon-btn {
      width: 36px; height: 36px;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      position: relative;
      flex-shrink: 0;
    }

    .icon-btn:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
      border-color: var(--border-medium);
    }

    .theme-toggle-btn {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
    }

    .theme-toggle-btn svg {
      width: 18px;
      height: 18px;
    }

    .notif-dot {
      position: absolute;
      top: 6px; right: 6px;
      width: 7px; height: 7px;
      background: var(--brand);
      border-radius: 50%;
      border: 2px solid var(--bg-page);
      box-shadow: 0 0 6px var(--brand-glow);
    }

    /* ====================================================
       AVATAR
    ==================================================== */
    .avatar-wrapper {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      position: relative;
      padding: 3px;
      border-radius: var(--radius-md);
      transition: background 0.15s;
    }

    .avatar-wrapper:hover { background: var(--bg-elevated); }

    .avatar {
      width: 32px; height: 32px;
      border-radius: var(--radius-sm);
      background: var(--gradient-brand-vivid);
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.03em;
      transition: all 0.25s var(--ease-spring);
      box-shadow: 0 2px 8px rgba(236,72,153,0.35);
    }

    .avatar.ring {
      box-shadow: 0 0 0 2px var(--brand), 0 4px 12px rgba(236,72,153,0.4);
    }

    .avatar-chevron {
      color: var(--text-muted);
      transition: transform 0.2s;
      display: flex;
    }

    .avatar-chevron.rotated { transform: rotate(180deg); }

    /* Dropdown */
    .avatar-menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      min-width: 220px;
      background: var(--bg-modal);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      overflow: hidden;
      z-index: 200;
    }

    .avatar-menu-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-subtle);
    }

    .avatar-menu-avatar {
      width: 38px; height: 38px;
      border-radius: var(--radius-sm);
      background: var(--gradient-brand-vivid);
      color: white;
      font-size: 0.8rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar-menu-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-primary);
    }

    .avatar-menu-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 4px 0;
    }

    .avatar-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      font-family: var(--font-body);
    }

    .avatar-menu-item:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    .avatar-menu-item.danger:hover {
      background: var(--danger-bg);
      color: var(--danger);
    }

    /* ====================================================
       HAMBURGER — mobile
    ==================================================== */
    .hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: var(--radius-sm);
      transition: background 0.15s;
    }

    .hamburger:hover { background: var(--bg-elevated); }

    .hamburger span {
      display: block;
      width: 20px; height: 2px;
      background: var(--text-secondary);
      border-radius: 2px;
      transition: all 0.3s var(--ease-spring);
      transform-origin: center;
    }

    .hamburger.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
    .hamburger.active span:nth-child(2) { opacity: 0; transform: scaleX(0); }
    .hamburger.active span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

    /* ====================================================
       BACKDROP
    ==================================================== */
    .nav-backdrop {
      position: fixed;
      inset: 0;
      z-index: 90;
      background: rgba(8,11,20,0);
      pointer-events: none;
      transition: background 0.3s;
    }

    .nav-backdrop.visible {
      background: rgba(8,11,20,0.6);
      pointer-events: all;
      backdrop-filter: blur(4px);
    }

    /* ====================================================
       MOBILE MENU EXTRAS (hidden on desktop)
    ==================================================== */
    .mobile-menu-header,
    .mobile-extras,
    .mobile-date {
      display: none;
    }

    /* ====================================================
       RESPONSIVE — MOBILE
    ==================================================== */
    @media (max-width: 768px) {
      .nav-clock    { display: none; }
      .icon-btn     { display: none; }
      .logo-version { display: none; }

      .hamburger {
        display: flex;
        z-index: 101;
      }

      /* Slide-in mobile drawer */
      .nav-links {
        position: fixed;
        top: 0;
        right: -100%;
        width: min(320px, 85vw);
        height: 100dvh;
        background: var(--bg-modal);
        border-left: 1px solid var(--border-medium);
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        padding: 20px;
        gap: 4px;
        z-index: 100;
        transition: right 0.35s var(--ease-spring);
        box-shadow: -20px 0 60px rgba(0,0,0,0.5);
        overflow-y: auto;
      }

      .nav-links.open { right: 0; }

      .mobile-menu-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--border-subtle);
      }

      .menu-close-btn {
        width: 32px; height: 32px;
        border-radius: var(--radius-sm);
        background: var(--bg-elevated);
        border: 1px solid var(--border-default);
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }

      .nav-link {
        padding: 12px 14px;
        font-size: 0.95rem;
        border-radius: var(--radius-sm);
      }

      .mobile-extras {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: auto;
        padding-top: 20px;
        border-top: 1px solid var(--border-subtle);
      }

      .mobile-date {
        display: block;
        font-size: 0.78rem;
        color: var(--text-muted);
        font-weight: 500;
      }

      /* Avatar dropdown adapts to mobile */
      .avatar-menu {
        position: fixed;
        top: auto;
        bottom: 0;
        right: 0;
        left: 0;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        min-width: unset;
        border-bottom: none;
        animation: slideUp 0.35s var(--ease-spring);
      }
    }

    @media (max-width: 480px) {
      .nav-logo { gap: 7px; }
      .logo-text { font-size: 1rem; }
      .logo-mark { width: 30px; height: 30px; }
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  themeService = inject(ThemeService);

  isScrolled    = signal(false);
  scrollProgress = signal(0);
  menuOpen      = signal(false);
  avatarMenuOpen = signal(false);
  currentTime   = signal('');
  currentDate   = signal('');

  private timeTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.updateTime();
    this.timeTimer = setInterval(() => this.updateTime(), 1000);
    this.updateScrollState();
  }

  ngOnDestroy() {
    if (this.timeTimer) clearInterval(this.timeTimer);
  }

  @HostListener('window:scroll')
  onScroll() {
    this.updateScrollState();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.avatar-wrapper')) {
      this.avatarMenuOpen.set(false);
    }
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.closeAll();
  }

  private updateScrollState() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    this.isScrolled.set(scrollTop > 10);
    this.scrollProgress.set(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
  }

  private updateTime() {
    const now = new Date();
    this.currentTime.set(
      now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    this.currentDate.set(
      now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    );
  }

  userInitials(): string {
    const username = this.authService.currentUser()?.username ?? '';
    return username.slice(0, 2).toUpperCase() || '??';
  }

  toggleAvatarMenu() {
    this.avatarMenuOpen.update(v => !v);
    this.menuOpen.set(false);
  }

  closeAll() {
    this.menuOpen.set(false);
    this.avatarMenuOpen.set(false);
  }

  logout() {
    this.closeAll();
    this.authService.logout();
  }
}