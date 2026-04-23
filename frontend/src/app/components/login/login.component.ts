import { Component, signal, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-scene">

      <!-- Animated background blobs -->
      <div class="blob blob-1" aria-hidden="true"></div>
      <div class="blob blob-2" aria-hidden="true"></div>
      <div class="blob blob-3" aria-hidden="true"></div>

      <!-- Grid texture overlay -->
      <div class="auth-grid" aria-hidden="true"></div>

      <div class="auth-wrapper">

        <!-- Left panel — branding (desktop only) -->
        <div class="auth-brand animate-in">
          <div class="brand-logo">
            <div class="brand-logo-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="white" stroke-width="2"/>
                <line x1="3" y1="9" x2="21" y2="9" stroke="white" stroke-width="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <circle cx="8" cy="14" r="1.2" fill="white"/>
                <circle cx="12" cy="14" r="1.2" fill="white"/>
                <circle cx="16" cy="14" r="1.2" fill="white"/>
              </svg>
            </div>
            <span class="brand-name">Reserva</span>
          </div>

          <h1 class="brand-headline">
            Gérez vos<br>
            <span class="text-gradient">réservations</span><br>
            simplement.
          </h1>

          <p class="brand-desc">
            Plateforme de réservation de salles professionnelle.
            Visualisez, réservez et gérez en temps réel.
          </p>

          <!-- Features list -->
          <ul class="brand-features">
            @for (f of features; track f.label) {
              <li class="brand-feature">
                <div class="feature-icon">
                  <span>{{ f.icon }}</span>
                </div>
                <span>{{ f.label }}</span>
              </li>
            }
          </ul>

          <!-- Stats row -->
          <div class="brand-stats">
            @for (s of stats; track s.label) {
              <div class="brand-stat">
                <div class="brand-stat-value">{{ s.value }}</div>
                <div class="brand-stat-label">{{ s.label }}</div>
              </div>
            }
          </div>
        </div>

        <!-- Right panel — auth form -->
        <div class="auth-panel animate-in animate-in-delay-1">

          <!-- Tab selector -->
          <div class="auth-tabs">
            <button class="auth-tab" [class.active]="activeTab() === 'login'"
              (click)="switchTab('login')">
              Connexion
            </button>
            <button class="auth-tab" [class.active]="activeTab() === 'register'"
              (click)="switchTab('register')">
              Inscription
            </button>
            <!-- Sliding pill indicator -->
            <div class="auth-tab-indicator"
              [style.left]="activeTab() === 'login' ? '4px' : 'calc(50% + 2px)'"
              [style.width]="'calc(50% - 6px)'">
            </div>
          </div>

          <!-- ============ LOGIN FORM ============ -->
          @if (activeTab() === 'login') {
            <div class="form-section animate-in" key="login">

              <div class="form-heading">
                <h2 class="form-title">Bon retour 👋</h2>
                <p class="form-subtitle">Connectez-vous à votre espace</p>
              </div>

              @if (error()) {
                <div class="alert alert-error animate-in">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ error() }}
                </div>
              }

              <form (ngSubmit)="onLogin()" #loginForm="ngForm" class="auth-form" autocomplete="on">

                <div class="form-group">
                  <label class="form-label" for="username">Identifiant</label>
                  <div class="input-group">
                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      [(ngModel)]="username"
                      required
                      autocomplete="username"
                      placeholder="Votre identifiant"
                      class="form-control"
                      [disabled]="isLoading()"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <div class="label-row">
                    <label class="form-label" for="password">Mot de passe</label>
                    <a href="#" class="forgot-link" (click)="$event.preventDefault()">Oublié ?</a>
                  </div>
                  <div class="input-group">
                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <input
                      [type]="showPassword() ? 'text' : 'password'"
                      id="password"
                      name="password"
                      [(ngModel)]="password"
                      required
                      autocomplete="current-password"
                      placeholder="••••••••"
                      class="form-control"
                      [disabled]="isLoading()"
                    />
                    <button type="button" class="password-toggle"
                      (click)="showPassword.set(!showPassword())"
                      [attr.aria-label]="showPassword() ? 'Masquer' : 'Afficher'">
                      @if (showPassword()) {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      } @else {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  class="btn btn-brand btn-block btn-lg submit-btn"
                  [class.loading]="isLoading()"
                  [disabled]="isLoading() || loginForm.invalid">
                  @if (!isLoading()) {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                    Se connecter
                  }
                </button>

              </form>

              <!-- Demo credentials -->
              <div class="demo-section">
                <div class="demo-label">Comptes de démonstration</div>
                <div class="demo-cards">
                  @for (cred of demoCreds; track cred.role) {
                    <button class="demo-card" (click)="fillCredentials(cred)" type="button">
                      <div class="demo-role-badge" [class]="cred.badgeClass">{{ cred.role }}</div>
                      <div class="demo-creds">
                        <span>{{ cred.username }}</span>
                        <span class="demo-sep">/</span>
                        <span class="demo-pwd">{{ cred.password }}</span>
                      </div>
                      <svg class="demo-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  }
                </div>
              </div>

            </div>
          }

          <!-- ============ REGISTER FORM ============ -->
          @if (activeTab() === 'register') {
            <div class="form-section animate-in" key="register">

              <div class="form-heading">
                <h2 class="form-title">Créer un compte</h2>
                <p class="form-subtitle">Rejoignez la plateforme Reserva</p>
              </div>

              @if (registerSuccess()) {
                <div class="success-banner animate-scale-in">
                  <div class="success-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <div class="success-title">Compte créé !</div>
                    <div class="success-desc">Redirection vers la connexion…</div>
                  </div>
                </div>
              }

              @if (error()) {
                <div class="alert alert-error animate-in">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ error() }}
                </div>
              }

              <form (ngSubmit)="onRegister()" #registerForm="ngForm" class="auth-form" autocomplete="off">

                <div class="form-group">
                  <label class="form-label" for="reg-username">Identifiant</label>
                  <div class="input-group">
                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <input
                      type="text"
                      id="reg-username"
                      name="reg-username"
                      [(ngModel)]="regUsername"
                      required
                      minlength="3"
                      autocomplete="off"
                      placeholder="Choisissez un identifiant"
                      class="form-control"
                      [disabled]="isLoading()"
                    />
                  </div>
                  <span class="form-hint">Minimum 3 caractères</span>
                </div>

                <div class="form-group">
                  <label class="form-label" for="reg-password">Mot de passe</label>
                  <div class="input-group">
                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <input
                      [type]="showRegPassword() ? 'text' : 'password'"
                      id="reg-password"
                      name="reg-password"
                      [(ngModel)]="regPassword"
                      required
                      minlength="6"
                      autocomplete="new-password"
                      placeholder="Minimum 6 caractères"
                      class="form-control"
                      [disabled]="isLoading()"
                      (input)="updatePasswordStrength()"
                    />
                    <button type="button" class="password-toggle"
                      (click)="showRegPassword.set(!showRegPassword())">
                      @if (showRegPassword()) {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      } @else {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>

                  <!-- Password strength indicator -->
                  @if (regPassword.length > 0) {
                    <div class="password-strength animate-in">
                      <div class="strength-bars">
                        @for (bar of [1,2,3,4]; track bar) {
                          <div class="strength-bar"
                            [class.filled]="passwordStrength() >= bar"
                            [class]="'strength-bar strength-' + strengthClass()">
                          </div>
                        }
                      </div>
                      <span class="strength-label" [class]="'strength-text-' + strengthClass()">
                        {{ strengthLabel() }}
                      </span>
                    </div>
                  }
                </div>

                <button
                  type="submit"
                  class="btn btn-brand btn-block btn-lg submit-btn"
                  [class.loading]="isLoading()"
                  [disabled]="isLoading() || registerForm.invalid">
                  @if (!isLoading()) {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    Créer mon compte
                  }
                </button>

              </form>

              <p class="auth-footer-note">
                En créant un compte, vous acceptez les
                <a href="#" (click)="$event.preventDefault()">conditions d'utilisation</a>.
              </p>

            </div>
          }

        </div>
      </div>

      <!-- Bottom wordmark -->
      <div class="auth-wordmark" aria-hidden="true">RESERVA</div>
    </div>
  `,
  styles: [`
    /* ====================================================
       SCENE & BACKGROUND
    ==================================================== */
    .auth-scene {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
      background: var(--bg-base);
    }

    /* Animated blobs */
    .blob {
      position: fixed;
      border-radius: 50%;
      filter: blur(90px);
      pointer-events: none;
      animation: blobFloat 12s ease-in-out infinite;
    }

    .blob-1 {
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 65%);
      top: -150px; left: -100px;
      animation-delay: 0s;
    }

    .blob-2 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 65%);
      bottom: -100px; right: -80px;
      animation-delay: -5s;
      animation-duration: 15s;
    }

    .blob-3 {
      width: 350px; height: 350px;
      background: radial-gradient(circle, rgba(192,132,252,0.1) 0%, transparent 65%);
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      animation-delay: -8s;
      animation-duration: 18s;
    }

    /* Grid texture */
    .auth-grid {
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 48px 48px;
      pointer-events: none;
    }

    /* ====================================================
       TWO-COLUMN WRAPPER
    ==================================================== */
    .auth-wrapper {
      display: grid;
      grid-template-columns: 1fr 480px;
      gap: 60px;
      width: 100%;
      max-width: 1100px;
      position: relative;
      z-index: 1;
    }

    /* ====================================================
       LEFT BRAND PANEL
    ==================================================== */
    .auth-brand {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 32px;
      padding: 20px 0;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-logo-mark {
      width: 44px; height: 44px;
      background: var(--gradient-brand-vivid);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(79,70,229,0.4);
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.04em;
    }

    .brand-headline {
      font-family: var(--font-display);
      font-size: clamp(2.2rem, 4vw, 3rem);
      font-weight: 700;
      letter-spacing: -0.04em;
      line-height: 1.1;
      color: var(--text-primary);
    }

    .brand-desc {
      font-size: 1rem;
      color: var(--text-muted);
      line-height: 1.65;
      max-width: 380px;
    }

    .brand-features {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .brand-feature {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .feature-icon {
      width: 32px; height: 32px;
      border-radius: var(--radius-sm);
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    .brand-stats {
      display: flex;
      gap: 28px;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
    }

    .brand-stat-value {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.03em;
    }

    .brand-stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 500;
      margin-top: 2px;
    }

    /* ====================================================
       RIGHT AUTH PANEL
    ==================================================== */
    .auth-panel {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl);
      padding: 40px 36px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.4);
      position: relative;
      overflow: hidden;
    }

    /* Subtle top glow line */
    .auth-panel::before {
      content: '';
      position: absolute;
      top: 0; left: 20%; right: 20%;
      height: 1px;
      background: var(--gradient-brand);
      opacity: 0.6;
      border-radius: 0 0 4px 4px;
    }

    /* ====================================================
       TAB SWITCHER
    ==================================================== */
    .auth-tabs {
      display: flex;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 4px;
      margin-bottom: 32px;
      position: relative;
    }

    .auth-tab {
      flex: 1;
      padding: 10px 16px;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      font-family: var(--font-body);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-muted);
      transition: color 0.25s;
      position: relative;
      z-index: 1;
    }

    .auth-tab.active { color: var(--text-primary); }
    .auth-tab:not(.active):hover { color: var(--text-secondary); }

    /* Sliding pill */
    .auth-tab-indicator {
      position: absolute;
      top: 4px;
      height: calc(100% - 8px);
      background: var(--bg-surface);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-medium);
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transition: left 0.3s var(--ease-spring);
      z-index: 0;
    }

    /* ====================================================
       FORM SECTION
    ==================================================== */
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .form-heading { margin-bottom: 4px; }

    .form-title {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin-bottom: 4px;
    }

    .form-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .forgot-link {
      font-size: 0.78rem;
      color: var(--brand);
      text-decoration: none;
      font-weight: 600;
    }
    .forgot-link:hover { text-decoration: underline; }

    /* Password toggle inside input */
    .input-group { position: relative; }
    .input-group .form-control { padding-left: 42px; padding-right: 42px; }
    .input-icon {
      position: absolute;
      left: 13px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }
    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.15s;
    }
    .password-toggle:hover { color: var(--text-primary); }

    /* Submit button */
    .submit-btn {
      margin-top: 4px;
      font-size: 0.9375rem;
      letter-spacing: 0.01em;
    }

    /* ====================================================
       PASSWORD STRENGTH
    ==================================================== */
    .password-strength {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }

    .strength-bars {
      display: flex;
      gap: 4px;
      flex: 1;
    }

    .strength-bar {
      flex: 1;
      height: 3px;
      border-radius: 2px;
      background: var(--bg-overlay);
      transition: background 0.3s;
    }

    .strength-bar.filled.strength-weak   { background: var(--danger); }
    .strength-bar.filled.strength-fair   { background: var(--warning); }
    .strength-bar.filled.strength-good   { background: var(--info); }
    .strength-bar.filled.strength-strong { background: var(--success); }

    .strength-label {
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .strength-text-weak   { color: var(--danger); }
    .strength-text-fair   { color: var(--warning); }
    .strength-text-good   { color: var(--info); }
    .strength-text-strong { color: var(--success); }

    /* ====================================================
       SUCCESS BANNER
    ==================================================== */
    .success-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      border-radius: var(--radius-md);
    }

    .success-icon {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: var(--success);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .success-title {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--success);
    }

    .success-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 1px;
    }

    /* ====================================================
       DEMO CREDENTIALS
    ==================================================== */
    .demo-section {
      border-top: 1px solid var(--border-subtle);
      padding-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .demo-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .demo-cards { display: flex; flex-direction: column; gap: 7px; }

    .demo-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;
      font-family: var(--font-body);
      text-align: left;
      width: 100%;
    }

    .demo-card:hover {
      background: var(--bg-overlay);
      border-color: var(--border-brand);
      box-shadow: 0 0 0 1px var(--border-brand);
    }

    .demo-role-badge {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      padding: 2px 7px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .demo-role-badge.admin-badge {
      background: var(--brand-subtle);
      color: var(--brand);
      border: 1px solid var(--border-brand);
    }

    .demo-role-badge.user-badge {
      background: rgba(255,255,255,0.05);
      color: var(--text-muted);
      border: 1px solid var(--border-default);
    }

    .demo-creds {
      flex: 1;
      display: flex;
      gap: 6px;
      font-size: 0.82rem;
      font-family: 'Courier New', monospace;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .demo-sep { color: var(--text-faint); }
    .demo-pwd { color: var(--text-muted); }

    .demo-arrow {
      color: var(--text-muted);
      transition: transform 0.2s;
      flex-shrink: 0;
    }

    .demo-card:hover .demo-arrow {
      transform: translateX(3px);
      color: var(--brand);
    }

    /* ====================================================
       FOOTER NOTE
    ==================================================== */
    .auth-footer-note {
      font-size: 0.78rem;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.5;
    }

    .auth-footer-note a { color: var(--brand); text-decoration: none; font-weight: 600; }
    .auth-footer-note a:hover { text-decoration: underline; }

    /* ====================================================
       WORDMARK
    ==================================================== */
    .auth-wordmark {
      position: fixed;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-family: var(--font-display);
      font-size: clamp(60px, 12vw, 110px);
      font-weight: 800;
      letter-spacing: 0.15em;
      color: transparent;
      -webkit-text-stroke: 1px rgba(255,255,255,0.04);
      pointer-events: none;
      white-space: nowrap;
      user-select: none;
    }

    /* ====================================================
       BLOB ANIMATION
    ==================================================== */
    @keyframes blobFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33%       { transform: translate(30px, -20px) scale(1.05); }
      66%       { transform: translate(-20px, 30px) scale(0.95); }
    }

    /* ====================================================
       RESPONSIVE
    ==================================================== */
    @media (max-width: 900px) {
      .auth-wrapper {
        grid-template-columns: 1fr;
        max-width: 480px;
      }

      .auth-brand { display: none; }

      .auth-panel {
        padding: 32px 28px;
      }
    }

    @media (max-width: 480px) {
      .auth-scene { padding: 16px; }
      .auth-panel  { padding: 24px 20px; }
      .auth-wordmark { display: none; }
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router      = inject(Router);
  http        = inject(HttpClient);

  activeTab = signal<'login' | 'register'>('login');

  username = '';
  password = '';
  regUsername = '';
  regPassword = '';

  isLoading       = signal(false);
  error           = signal<string | null>(null);
  registerSuccess = signal(false);
  showPassword    = signal(false);
  showRegPassword = signal(false);
  passwordStrength = signal(0);

  features = [
    { icon: '⚡', label: 'Réservation en temps réel avec WebSocket' },
    { icon: '🗓️', label: 'Calendrier visuel avec timeline des créneaux' },
    { icon: '💳', label: 'Paiements en ligne intégrés' },
    { icon: '📱', label: 'Notifications email & SMS automatiques' },
  ];

  stats = [
    { value: '4',    label: 'Salles' },
    { value: '100%', label: 'Disponibilité' },
    { value: '24/7', label: 'Accès' },
  ];

  demoCreds = [
    { role: 'Admin',      username: 'admin', password: 'admin123', badgeClass: 'admin-badge' },
    { role: 'Utilisateur', username: 'alice', password: 'alice123', badgeClass: 'user-badge' },
  ];

  switchTab(tab: 'login' | 'register') {
    this.activeTab.set(tab);
    this.error.set(null);
    this.registerSuccess.set(false);
  }

  fillCredentials(cred: { username: string; password: string }) {
    this.username = cred.username;
    this.password = cred.password;
    this.activeTab.set('login');
    this.error.set(null);
  }

  updatePasswordStrength() {
    const p = this.regPassword;
    let score = 0;
    if (p.length >= 6)  score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) || /[0-9]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p) && p.length >= 8) score++;
    this.passwordStrength.set(score);
  }

  strengthClass(): string {
    const s = this.passwordStrength();
    if (s <= 1) return 'weak';
    if (s === 2) return 'fair';
    if (s === 3) return 'good';
    return 'strong';
  }

  strengthLabel(): string {
    const s = this.passwordStrength();
    if (s <= 1) return 'Faible';
    if (s === 2) return 'Moyen';
    if (s === 3) return 'Bon';
    return 'Fort';
  }

  onLogin() {
    this.isLoading.set(true);
    this.error.set(null);

    this.authService.login(this.username, this.password).subscribe({
      next: (res: any) => {
        const isAdmin = res.user.role === 'admin';
        this.router.navigate([isAdmin ? '/dashboard' : '/bookings']);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Identifiants incorrects.');
        this.isLoading.set(false);
      }
    });
  }

  onRegister() {
    this.isLoading.set(true);
    this.error.set(null);
    this.registerSuccess.set(false);

    this.http.post(`${environment.apiUrl}/auth/register`, {
      username: this.regUsername,
      password: this.regPassword,
      role: 'user'
    }).subscribe({
      next: () => {
        this.registerSuccess.set(true);
        this.isLoading.set(false);
        this.regUsername = '';
        this.regPassword = '';
        this.passwordStrength.set(0);
        setTimeout(() => this.switchTab('login'), 1800);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Erreur lors de la création du compte.');
        this.isLoading.set(false);
      }
    });
  }
}