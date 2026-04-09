import { Component, signal, OnInit, inject, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BookingService } from '../../services/booking.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { Booking, CreateBookingDto } from '../../models/booking.model';
import { environment } from '../../../environments/environment';

interface Resource {
  _id: string;
  name: string;
  description: string;
  capacity: number;
  available: boolean;
}

@Component({
  selector: 'app-booking-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-8">
      <div class="booking-grid">
        <section class="booking-form-section glass card">
          <h2 class="section-title">Book a Resource</h2>
          <p class="section-subtitle">Choose a resource and time slot</p>

          @if (resources().length === 0) {
            <div class="no-resources">
              <p>No resources available yet.</p>
              <p class="text-muted text-sm">Please check back later.</p>
            </div>
          } @else {
            <div class="resource-picker">
              @for (res of resources(); track res._id) {
                <div class="resource-option"
                  [class.selected]="newBooking.resourceId === res._id"
                  (click)="selectResource(res)">
                  <div class="res-option-header">
                    <span class="res-option-name">{{ res.name }}</span>
                    <span class="res-capacity">👥 {{ res.capacity }}</span>
                  </div>
                  <p class="res-option-desc text-muted text-sm">{{ res.description }}</p>
                </div>
              }
            </div>

            <form (ngSubmit)="onBookingSubmit()" #bookingForm="ngForm" class="mt-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="form-group">
                  <label>Start Time</label>
                  <input type="datetime-local" name="startTime"
                    [(ngModel)]="newBooking.startTime" required class="form-control">
                </div>
                <div class="form-group">
                  <label>End Time</label>
                  <input type="datetime-local" name="endTime"
                    [(ngModel)]="newBooking.endTime" required class="form-control">
                </div>
              </div>
              <div class="form-group">
                <label>Notes (Optional)</label>
                <textarea name="notes" [(ngModel)]="newBooking.notes"
                  placeholder="Add any special requests..." class="form-control" rows="2"></textarea>
              </div>
              @if (bookingError()) {
                <div class="alert alert-error">{{ bookingError() }}</div>
              }
              @if (bookingSuccess()) {
                <div class="alert alert-success">Reservation confirmed!</div>
              }
              <button type="submit" class="btn btn-primary btn-block btn-lg"
                [disabled]="!newBooking.resourceId || bookingForm.invalid || isSubmitting()">
                {{ isSubmitting() ? 'Reserving...' : 'Confirm Reservation' }}
              </button>
            </form>
          }
        </section>

        <section class="bookings-list-section">
          <div class="flex justify-between items-center mb-6">
            <h2 class="section-title h3">My Reservations</h2>
            <button (click)="loadBookings()" class="btn btn-outline btn-sm">Refresh</button>
          </div>
          @if (isLoading()) {
            <div class="loading-state glass card">
              <div class="spinner"></div>
              <p>Loading your bookings...</p>
            </div>
          } @else if (myBookings().length === 0) {
            <div class="empty-state glass card">
              <p>No reservations found yet.</p>
              <p class="text-muted text-sm">Start by booking your first resource!</p>
            </div>
          } @else {
            <div class="bookings-grid-compact">
              @for (booking of myBookings(); track booking._id) {
                <div class="booking-card glass card hover-scale"
                  [attr.data-status]="booking.status"
                  [class.just-updated]="recentlyUpdated().has(booking._id)">
                  <div class="booking-card-header">
                    <span class="status-badge" [attr.data-status]="booking.status">{{ booking.status }}</span>
                    <span class="booking-date text-muted text-sm">{{ booking.createdAt | date:'MMM d, HH:mm' }}</span>
                  </div>
                  <h3 class="booking-resource">{{ booking.resourceName }}</h3>
                  <div class="booking-times">
                    <div class="time-item">
                      <span class="label">From:</span>
                      <span class="value">{{ booking.startTime | date:'MMM d, h:mm a' }}</span>
                    </div>
                    <div class="time-item">
                      <span class="label">To:</span>
                      <span class="value">{{ booking.endTime | date:'h:mm a' }}</span>
                    </div>
                  </div>
                  <div class="booking-footer">
                    @if (booking.status !== 'cancelled') {
                      <button (click)="onCancel(booking._id)" class="btn btn-danger-link btn-sm">Cancel</button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .booking-grid { display: grid; grid-template-columns: 1fr; gap: 40px; }
    @media (min-width: 1024px) { .booking-grid { grid-template-columns: 420px 1fr; } }
    .section-title { font-weight: 800; color: var(--text-primary); margin: 0; }
    .section-subtitle { color: var(--text-secondary); margin-top: 4px; font-size: 0.95rem; }
    .resource-picker { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
    .resource-option { padding: 14px 16px; border: 2px solid var(--border); border-radius: 14px; cursor: pointer; transition: all 0.2s; background: white; }
    .resource-option:hover { border-color: var(--primary); background: var(--primary-light); }
    .resource-option.selected { border-color: var(--primary); background: var(--primary-light); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .res-option-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .res-option-name { font-weight: 700; font-size: 0.95rem; }
    .res-capacity { font-size: 0.8rem; color: var(--text-muted); }
    .res-option-desc { font-size: 0.82rem; margin: 0; }
    .no-resources { text-align: center; padding: 40px 20px; color: var(--text-muted); }
    .bookings-grid-compact { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .booking-card { padding: 20px; border-radius: 16px; position: relative; overflow: hidden; transition: all 0.3s; }
    .booking-card::before { content: ''; position: absolute; left: 0; top: 0; width: 4px; height: 100%; background: var(--text-muted); }
    .booking-card[data-status="confirmed"]::before { background: var(--success); }
    .booking-card[data-status="pending"]::before { background: var(--warning); }
    .booking-card[data-status="cancelled"]::before { background: var(--danger); }
    .booking-card.just-updated { animation: flashUpdate 1.5s ease-out; }
    @keyframes flashUpdate { 0% { box-shadow: 0 0 0 3px rgba(99,102,241,0.5); } 100% { box-shadow: none; } }
    .booking-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .status-badge { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; }
    .status-badge[data-status="confirmed"] { color: var(--success); background: rgba(16,185,129,0.1); }
    .status-badge[data-status="pending"] { color: var(--warning); background: rgba(245,158,11,0.1); }
    .status-badge[data-status="cancelled"] { color: var(--danger); background: rgba(239,68,68,0.1); }
    .booking-resource { font-size: 1.05rem; font-weight: 700; margin: 0 0 10px 0; }
    .booking-times { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
    .time-item { display: flex; gap: 8px; font-size: 0.88rem; }
    .time-item .label { color: var(--text-muted); }
    .time-item .value { font-weight: 500; }
    .booking-footer { display: flex; justify-content: flex-end; border-top: 1px solid var(--border); margin-top: 10px; padding-top: 10px; }
    .empty-state, .loading-state { padding: 60px; text-align: center; border-radius: 24px; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; margin: 0 auto 16px auto; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .alert { padding: 12px 16px; border-radius: 10px; font-size: 0.9rem; font-weight: 500; margin-bottom: 12px; }
    .alert-error { background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.2); }
    .alert-success { background: rgba(16,185,129,0.1); color: var(--success); border: 1px solid rgba(16,185,129,0.2); }
  `]
})
export class BookingClientComponent implements OnInit, OnDestroy {
  bookingService = inject(BookingService);
  socketService = inject(SocketService);
  authService = inject(AuthService);
  http = inject(HttpClient);

  myBookings = signal<Booking[]>([]);
  resources = signal<Resource[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  bookingError = signal<string | null>(null);
  bookingSuccess = signal(false);
  recentlyUpdated = signal<Set<string>>(new Set());

  newBooking: CreateBookingDto = {
    resourceId: '', resourceName: '', startTime: '', endTime: '', notes: ''
  };

  constructor() {
    effect(() => {
      const update = this.socketService.latestBookingUpdate();
      if (update) {
        this.myBookings.update(list =>
          list.map(b => b._id === (update.booking as any)._id ? { ...b, ...update.booking } : b)
        );
        this.markUpdated((update.booking as any)._id);
      }
    });

    effect(() => {
      const update = this.socketService.resourceUpdate();
      if (!update) return;
      if (update.event === 'resource:created' && update.resource.available) {
        this.resources.update(list => [update.resource, ...list]);
      } else if (update.event === 'resource:updated') {
        this.resources.update(list =>
          list.map(r => r._id === update.resource._id ? update.resource : r).filter(r => r.available)
        );
      } else if (update.event === 'resource:deleted') {
        this.resources.update(list => list.filter(r => r._id !== update.resource._id));
      }
    });
  }

  ngOnInit() {
    this.loadBookings();
    this.loadResources();
    this.socketService.connect();
  }

  ngOnDestroy() {
    this.socketService.disconnect();
  }

  loadResources() {
    // ✅ URL dynamique via environment
    this.http.get<Resource[]>(`${environment.apiUrl}/api/resources/available`).subscribe({
      next: (data) => this.resources.set(data),
      error: () => console.warn('Could not load resources')
    });
  }

  loadBookings() {
    this.isLoading.set(true);
    this.bookingService.getMyBookings().subscribe({
      next: (data) => { this.myBookings.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  selectResource(res: Resource) {
    this.newBooking.resourceId = res._id;
    this.newBooking.resourceName = res.name;
  }

  onBookingSubmit() {
    this.isSubmitting.set(true);
    this.bookingError.set(null);
    this.bookingSuccess.set(false);

    const payload: CreateBookingDto = {
      ...this.newBooking,
      startTime: new Date(this.newBooking.startTime).toISOString(),
      endTime: new Date(this.newBooking.endTime).toISOString(),
    };

    this.bookingService.createBooking(payload).subscribe({
      next: () => {
        this.bookingSuccess.set(true);
        this.loadBookings();
        this.isSubmitting.set(false);
        this.resetForm();
        setTimeout(() => this.bookingSuccess.set(false), 3000);
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Booking failed.';
        this.bookingError.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.isSubmitting.set(false);
      }
    });
  }

  onCancel(id: string) {
    if (confirm('Cancel this booking?')) {
      this.bookingService.cancelBooking(id).subscribe({
        next: () => this.loadBookings()
      });
    }
  }

  private markUpdated(id: string) {
    this.recentlyUpdated.update(s => { const n = new Set(s); n.add(id); return n; });
    setTimeout(() => {
      this.recentlyUpdated.update(s => { const n = new Set(s); n.delete(id); return n; });
    }, 2000);
  }

  private resetForm() {
    this.newBooking = { resourceId: '', resourceName: '', startTime: '', endTime: '', notes: '' };
  }
}