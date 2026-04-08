
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    <div class="app-layout">
      <app-navbar></app-navbar>
      
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
      
      <footer class="app-footer py-8">
        <div class="container text-center">
          <p class="text-muted text-sm">&copy; 2026 Reserva - Premium Reservation System</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .app-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .main-content {
      flex: 1;
    }

    .app-footer {
      border-top: 1px solid var(--border);
      margin-top: auto;
    }
  `]
})
export class AppComponent {
  title = 'reserva-frontend';
}
