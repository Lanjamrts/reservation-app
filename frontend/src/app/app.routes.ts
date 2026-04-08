
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard-admin/dashboard-admin.component').then(m => m.DashboardAdminComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'bookings',
    loadComponent: () => import('./components/booking-client/booking-client.component').then(m => m.BookingClientComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'bookings',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'bookings'
  }
];
