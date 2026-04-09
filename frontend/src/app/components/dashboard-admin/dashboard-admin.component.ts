import { Component, signal, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BookingService } from '../../services/booking.service';
import { SocketService } from '../../services/socket.service';
import { Booking, BookingStatus } from '../../models/booking.model';
import { environment } from '../../../environments/environment';

interface Resource {
  _id: string;
  name: string;
  description: string;
  capacity: number;
  available: boolean;
}

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-8">
      <header class="dashboard-header mb-8">
        <div>
          <h1 class="h2 page-title">Admin Dashboard</h1>
          <p class="text-secondary">Manage reservations and resources</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card glass card">
            <span class="stat-label">Total Bookings</span>
            <span class="stat-value">{{ allBookings().length }}</span>
          </div>
          <div class="stat-card glass card">
            <span class="stat-label">Pending</span>
            <span class="stat-value text-warning">{{ getCountByStatus('pending') }}</span>
          </div>
          <div class="stat-card glass card">
            <span class="stat-label">Resources</span>
            <span class="stat-value text-primary">{{ resources().length }}</span>
          </div>
        </div>
      </header>

      <div class="tab-bar mb-6">
        <button class="tab-btn" [class.active]="activeTab() === 'bookings'" (click)="activeTab.set('bookings')">Reservations</button>
        <button class="tab-btn" [class.active]="activeTab() === 'resources'" (click)="activeTab.set('resources')">Manage Resources</button>
      </div>

      @if (activeTab() === 'bookings') {
        @if (isLoading()) {
          <div class="loading-full"><div class="spinner"></div><p>Loading reservations...</p></div>
        } @else {
          <div class="admin-controls mb-6 flex justify-between items-center">
            <div class="filters flex gap-4">
              <button (click)="filterByStatus('all')" class="chip" [class.active]="filter() === 'all'">All</button>
              <button (click)="filterByStatus('pending')" class="chip" [class.active]="filter() === 'pending'">Pending</button>
              <button (click)="filterByStatus('confirmed')" class="chip" [class.active]="filter() === 'confirmed'">Confirmed</button>
            </div>
            <button (click)="loadAll()" class="btn btn-outline btn-sm">Refresh</button>
          </div>
          <div class="table-container glass card">
            <table class="admin-table">
              <thead>
                <tr><th>User</th><th>Resource</th><th>Duration</th><th>Status</th><th class="text-right">Actions</th></tr>
              </thead>
              <tbody>
                @for (booking of filteredBookings(); track booking._id) {
                  <tr [class.row-new]="isRecentlyUpdated(booking._id)">
                    <td><div class="user-info"><span class="user-name">{{ booking.userName }}</span><span class="user-id">{{ booking.userId }}</span></div></td>
                    <td><span class="res-name">{{ booking.resourceName }}</span></td>
                    <td><div class="time-info"><div>{{ booking.startTime | date:'MMM d, HH:mm' }} - {{ booking.endTime | date:'HH:mm' }}</div><div class="text-muted text-xs">{{ getDuration(booking.startTime, booking.endTime) }} mins</div></div></td>
                    <td><span class="status-pill" [attr.data-status]="booking.status">{{ booking.status }}</span></td>
                    <td class="text-right">
                      <div class="action-group">
                        @if (booking.status === 'pending') {
                          <button (click)="updateStatus(booking, BookingStatus.CONFIRMED)" class="btn-icon btn-success-light" title="Confirm">✓</button>
                        }
                        @if (booking.status !== 'cancelled') {
                          <button (click)="updateStatus(booking, BookingStatus.CANCELLED)" class="btn-icon btn-danger-light" title="Cancel">✕</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="text-center py-12 text-muted">No reservations found.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      @if (activeTab() === 'resources') {
        <div class="resources-layout">
          <section class="resource-form-section glass card">
            <h3 class="section-title">{{ editingResource() ? 'Edit Resource' : 'Add New Resource' }}</h3>
            @if (saveError()) { <div class="alert alert-error">{{ saveError() }}</div> }
            @if (saveSuccess()) { <div class="alert alert-success">Resource saved!</div> }
            <div class="form-group">
              <label>Resource Name</label>
              <input type="text" [(ngModel)]="resForm.name" placeholder="e.g. Conference Room B" class="form-control" />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="resForm.description" placeholder="What is this space for?" class="form-control" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label>Capacity (persons)</label>
              <input type="number" [(ngModel)]="resForm.capacity" min="1" class="form-control" />
            </div>
            <div class="form-group toggle-group">
              <label>Available for booking</label>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="resForm.available" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="form-actions">
              @if (editingResource()) {
                <button class="btn btn-outline btn-sm" (click)="cancelEdit()">Cancel</button>
              }
              <button class="btn btn-primary btn-block" (click)="saveResource()" [disabled]="!resForm.name || isSaving()">
                {{ isSaving() ? 'Saving...' : (editingResource() ? 'Save Changes' : 'Add Resource') }}
              </button>
            </div>
          </section>

          <section class="resources-list">
            <div class="flex justify-between items-center mb-4">
              <h3 class="section-title" style="margin-bottom:0">Current Resources</h3>
              <button (click)="loadResources()" class="btn btn-outline btn-sm">Refresh</button>
            </div>
            @if (isLoadingResources()) {
              <div class="loading-full"><div class="spinner"></div></div>
            }
            @for (res of resources(); track res._id) {
              <div class="resource-card glass card" [class.unavailable]="!res.available">
                <div class="resource-card-header">
                  <div>
                    <h4 class="res-title">{{ res.name }}</h4>
                    <p class="res-desc text-muted text-sm">{{ res.description }}</p>
                  </div>
                  <span class="avail-badge" [class.on]="res.available">{{ res.available ? 'Available' : 'Unavailable' }}</span>
                </div>
                <div class="resource-meta"><span class="meta-item">👥 {{ res.capacity }} persons</span></div>
                <div class="resource-actions">
                  <button class="btn btn-outline btn-sm" (click)="editResource(res)">Edit</button>
                  <button class="btn btn-sm btn-danger-outline" (click)="deleteResource(res._id)">Delete</button>
                </div>
              </div>
            } @empty {
              @if (!isLoadingResources()) {
                <div class="empty-state glass card"><p class="text-muted">No resources yet. Add your first resource.</p></div>
              }
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-title { margin: 0; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; }
    .stats-grid { display: flex; gap: 16px; flex-wrap: wrap; }
    .stat-card { padding: 12px 24px; display: flex; flex-direction: column; min-width: 120px; border-radius: 16px; }
    .stat-label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
    .text-primary { color: var(--primary) !important; }
    .text-warning { color: var(--warning) !important; }
    .tab-bar { display: flex; background: rgba(0,0,0,0.05); border-radius: 12px; padding: 4px; width: fit-content; }
    .tab-btn { padding: 8px 24px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer; color: var(--text-muted); transition: all 0.2s; }
    .tab-btn.active { background: white; color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .chip { padding: 6px 16px; border-radius: 20px; background: rgba(0,0,0,0.05); border: 1px solid transparent; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .chip:hover { background: rgba(0,0,0,0.08); }
    .chip.active { background: var(--primary); color: white; }
    .table-container { overflow-x: auto; border-radius: 20px; padding: 8px; }
    .admin-table { width: 100%; border-collapse: separate; border-spacing: 0 4px; }
    .admin-table th { padding: 16px; text-align: left; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .admin-table td { padding: 16px; background: rgba(255,255,255,0.3); border-top: 1px solid rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.5); }
    .admin-table tr td:first-child { border-left: 1px solid rgba(255,255,255,0.5); border-radius: 12px 0 0 12px; }
    .admin-table tr td:last-child { border-right: 1px solid rgba(255,255,255,0.5); border-radius: 0 12px 12px 0; }
    .user-info, .time-info { display: flex; flex-direction: column; }
    .user-name { font-weight: 700; }
    .user-id { font-size: 0.75rem; color: var(--text-muted); font-family: monospace; }
    .status-pill { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; }
    .status-pill[data-status="confirmed"] { color: var(--success); background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); }
    .status-pill[data-status="pending"] { color: var(--warning); background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); }
    .status-pill[data-status="cancelled"] { color: var(--danger); background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); }
    .action-group { display: flex; gap: 8px; justify-content: flex-end; }
    .btn-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; transition: all 0.2s; }
    .btn-success-light { color: var(--success); background: rgba(16,185,129,0.1); }
    .btn-success-light:hover { background: var(--success); color: white; }
    .btn-danger-light { color: var(--danger); background: rgba(239,68,68,0.1); }
    .btn-danger-light:hover { background: var(--danger); color: white; }
    .row-new { animation: pulseBg 2s ease-out; }
    @keyframes pulseBg { 0% { background: rgba(99,102,241,0.1); } 100% { background: transparent; } }
    .loading-full { text-align: center; padding: 60px 0; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .resources-layout { display: grid; grid-template-columns: 340px 1fr; gap: 32px; align-items: start; }
    @media (max-width: 900px) { .resources-layout { grid-template-columns: 1fr; } }
    .resource-form-section { padding: 28px; border-radius: 20px; }
    .section-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; }
    .toggle-group { display: flex; justify-content: space-between; align-items: center; }
    .toggle-group label:first-child { margin-bottom: 0; }
    .toggle { position: relative; display: inline-block; width: 42px; height: 24px; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-track { position: absolute; inset: 0; background: var(--border); border-radius: 24px; transition: 0.2s; cursor: pointer; }
    .toggle-track::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .toggle-track { background: var(--primary); }
    .toggle input:checked + .toggle-track::before { transform: translateX(18px); }
    .form-actions { display: flex; gap: 8px; margin-top: 8px; }
    .resource-card { padding: 20px; border-radius: 16px; margin-bottom: 12px; }
    .resource-card.unavailable { opacity: 0.6; }
    .resource-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
    .res-title { font-weight: 700; font-size: 1rem; margin-bottom: 2px; }
    .avail-badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; white-space: nowrap; color: var(--danger); background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); }
    .avail-badge.on { color: var(--success); background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); }
    .resource-meta { margin-bottom: 14px; }
    .meta-item { font-size: 0.85rem; color: var(--text-muted); }
    .resource-actions { display: flex; gap: 8px; }
    .btn-danger-outline { background: transparent; border: 1px solid rgba(239,68,68,0.3); color: var(--danger); border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.8125rem; padding: 6px 12px; transition: all 0.2s; }
    .btn-danger-outline:hover { background: var(--danger); color: white; }
    .empty-state { padding: 40px; text-align: center; border-radius: 16px; }
    .mb-4 { margin-bottom: 16px; }
    .py-12 { padding: 48px 0; }
    .alert { padding: 12px 16px; border-radius: 10px; font-size: 0.9rem; font-weight: 500; margin-bottom: 16px; }
    .alert-error { background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.2); }
    .alert-success { background: rgba(16,185,129,0.1); color: var(--success); border: 1px solid rgba(16,185,129,0.2); }
  `]
})
export class DashboardAdminComponent implements OnInit {
  protected readonly BookingStatus = BookingStatus;
  bookingService = inject(BookingService);
  socketService = inject(SocketService);
  http = inject(HttpClient);

  // ✅ URL correcte pour les ressources
  private readonly API = `${environment.apiUrl}/api/resources`;

  activeTab = signal<'bookings' | 'resources'>('bookings');
  allBookings = signal<Booking[]>([]);
  filter = signal<'all' | 'pending' | 'confirmed'>('all');
  isLoading = signal(true);
  isLoadingResources = signal(false);
  isSaving = signal(false);
  recentUpdates = signal<Set<string>>(new Set());
  filteredBookings = signal<Booking[]>([]);
  resources = signal<Resource[]>([]);
  editingResource = signal<Resource | null>(null);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  resForm = { name: '', description: '', capacity: 10, available: true };

  constructor() {
    effect(() => {
      const bookings = this.allBookings();
      const f = this.filter();
      this.filteredBookings.set(f === 'all' ? bookings : bookings.filter(b => b.status === f));
    }, { allowSignalWrites: true });

    effect(() => {
      const update = this.socketService.adminUpdate();
      if (update) this.handleRealtimeUpdate(update);
    });
  }

  ngOnInit() {
    this.loadAll();
    this.loadResources();
    this.socketService.connect();
  }

  loadAll() {
    this.isLoading.set(true);
    this.bookingService.getAllBookings().subscribe({
      next: (data) => { this.allBookings.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  loadResources() {
    this.isLoadingResources.set(true);
    this.http.get<Resource[]>(this.API).subscribe({
      next: (data) => { this.resources.set(data); this.isLoadingResources.set(false); },
      error: () => this.isLoadingResources.set(false)
    });
  }

  saveResource() {
    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    const editing = this.editingResource();
    const req = editing
      ? this.http.patch<Resource>(`${this.API}/${editing._id}`, this.resForm)
      : this.http.post<Resource>(this.API, this.resForm);

    req.subscribe({
      next: (saved) => {
        if (editing) {
          this.resources.update(list => list.map(r => r._id === editing._id ? saved : r));
        } else {
          this.resources.update(list => [saved, ...list]);
        }
        this.saveSuccess.set(true);
        this.isSaving.set(false);
        this.editingResource.set(null);
        this.resetResForm();
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.saveError.set(err.error?.message || 'Failed to save resource.');
        this.isSaving.set(false);
      }
    });
  }

  editResource(res: Resource) {
    this.editingResource.set(res);
    this.resForm = { name: res.name, description: res.description, capacity: res.capacity, available: res.available };
  }

  cancelEdit() { this.editingResource.set(null); this.resetResForm(); }

  deleteResource(id: string) {
    if (confirm('Delete this resource?')) {
      this.http.delete(`${this.API}/${id}`).subscribe({
        next: () => this.resources.update(list => list.filter(r => r._id !== id)),
        error: () => alert('Failed to delete resource.')
      });
    }
  }

  updateStatus(booking: Booking, status: BookingStatus) {
    this.bookingService.updateStatus(booking._id, { status }).subscribe({
      next: () => this.allBookings.update(list => list.map(b => b._id === booking._id ? { ...b, status } : b))
    });
  }

  filterByStatus(s: 'all' | 'pending' | 'confirmed') { this.filter.set(s); }
  getCountByStatus(s: string) { return this.allBookings().filter(b => b.status === s).length; }
  getDuration(start: string, end: string) { return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000); }
  isRecentlyUpdated(id: string) { return this.recentUpdates().has(id); }

  private resetResForm() { this.resForm = { name: '', description: '', capacity: 10, available: true }; }

  private handleRealtimeUpdate(payload: any) {
    const { event, booking } = payload;
    this.recentUpdates.update(s => { const n = new Set(s); n.add(booking._id); return n; });
    setTimeout(() => { this.recentUpdates.update(s => { const n = new Set(s); n.delete(booking._id); return n; }); }, 5000);
    if (event === 'booking:created') {
      this.allBookings.update(list => [booking, ...list]);
    } else {
      this.allBookings.update(list => list.map(b => b._id === booking._id ? booking : b));
    }
  }
}