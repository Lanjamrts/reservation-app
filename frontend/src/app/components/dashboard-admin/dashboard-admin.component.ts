import {
  Component, signal, OnInit, inject, effect, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
  photos: string[];
  amenities: string[];
  rules: string;
  location: string;
  pricePerHour: number;
  status: 'available' | 'reserved' | 'maintenance';
}

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <!-- Toast Container -->
    <div class="toast-container" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" [class.out]="toast.leaving">
          <span class="toast-icon">{{ toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️' }}</span>
          {{ toast.message }}
        </div>
      }
    </div>

    <!-- Main Content -->
    <div class="admin-page">
      <header class="admin-header">
        <div>
          <h1 class="h2 page-title text-gradient">Dashboard Administrateur</h1>
          <p class="text-secondary">Supervision complète de Reserva</p>
        </div>
        <div class="header-actions">
           <div class="ws-indicator" [class.connected]="wsConnected()">
            <span class="ws-dot"></span>
            {{ wsConnected() ? 'Direct' : 'Hors ligne' }}
          </div>
        </div>
      </header>

      <!-- Navigation Tabs -->
      <div class="admin-nav mb-6">
        <button class="nav-tab" [class.active]="activeTab() === 'overview'" (click)="activeTab.set('overview')">
          📊 Vue d'ensemble
        </button>
        <button class="nav-tab" [class.active]="activeTab() === 'resources'" (click)="activeTab.set('resources')">
          🏢 Salles & Lieux
        </button>
        <button class="nav-tab" [class.active]="activeTab() === 'bookings'" (click)="activeTab.set('bookings')">
          📅 Réservations & Paiements
        </button>
      </div>

      <!-- TAB 1: OVERVIEW -->
      @if (activeTab() === 'overview') {
        <div class="overview-grid animate-in">
          <!-- Stats KPIs -->
          <div class="kpi-card card">
             <span class="kpi-icon flex items-center justify-center bg-blue-100 text-blue-600">📅</span>
             <div class="kpi-info">
               <span class="kpi-label">Réservations totales</span>
               <span class="kpi-val">{{ generalStats()?.total ?? '-' }}</span>
             </div>
          </div>
          <div class="kpi-card card">
             <span class="kpi-icon flex items-center justify-center bg-green-100 text-green-600">💸</span>
             <div class="kpi-info">
               <span class="kpi-label">Revenus Confirmés</span>
               <span class="kpi-val">{{ paymentStats()?.totalRevenue | number }} Ar</span>
             </div>
          </div>
          <div class="kpi-card card">
             <span class="kpi-icon flex items-center justify-center bg-purple-100 text-purple-600">📈</span>
             <div class="kpi-info">
               <span class="kpi-label">Taux d'occupation</span>
               <span class="kpi-val">{{ generalStats()?.occupancyRate ?? '-' }}%</span>
             </div>
          </div>
          <div class="kpi-card card">
             <span class="kpi-icon flex items-center justify-center bg-amber-100 text-amber-600">🏢</span>
             <div class="kpi-info">
               <span class="kpi-label">Salles Actives</span>
               <span class="kpi-val">{{ resourceStats()?.available ?? '-' }}/{{ resourceStats()?.total ?? '-' }}</span>
             </div>
          </div>

          <!-- Charts Area -->
          <div class="charts-area mt-4">
             <div class="chart-box card">
               <h3 class="chart-title">Revenus des 6 derniers mois</h3>
               <div class="css-bar-chart">
                 @for (stat of paymentStats()?.monthlyRevenue; track stat.month) {
                    <div class="bar-col">
                      <div class="bar-fill" [style.height]="getBarHeight(stat.amount)">
                        <span class="bar-tooltip">{{ stat.amount | number }} Ar</span>
                      </div>
                      <span class="bar-label">{{ stat.month | slice:5:7 }}/{{ stat.month | slice:2:4 }}</span>
                    </div>
                 }
               </div>
             </div>

             <div class="chart-box card">
               <h3 class="chart-title">Statut des Salles</h3>
               <div class="css-pie-chart" [style]="getPieStyles()">
                 <div class="pie-hole"></div>
               </div>
               <div class="pie-legend mt-4">
                 <div class="legend-item"><span class="ldot available"></span> Libre ({{ resourceStats()?.available ?? 0 }})</div>
                 <div class="legend-item"><span class="ldot reserved"></span> Occupée ({{ resourceStats()?.reserved ?? 0 }})</div>
                 <div class="legend-item"><span class="ldot maint"></span> Maint. ({{ resourceStats()?.maintenance ?? 0 }})</div>
               </div>
             </div>
          </div>
        </div>
      }

      <!-- TAB 2: RESOURCES -->
      @if (activeTab() === 'resources') {
        <div class="resources-layout animate-in">
          <!-- Editor Form -->
          <section class="resource-form-section card-elevated">
            <h3 class="section-title">{{ editingResource() ? 'Modifier la salle' : 'Nouvelle salle' }}</h3>

            <div class="form-group">
              <label>Nom de la salle *</label>
              <input type="text" [(ngModel)]="resForm.name" placeholder="Ex: Salle de conférence A" class="form-control" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label>Capacité (personnes)</label>
                <input type="number" [(ngModel)]="resForm.capacity" class="form-control" />
              </div>
              <div class="form-group">
                <label>Tarif horaire (Ar)</label>
                <input type="number" [(ngModel)]="resForm.pricePerHour" class="form-control" />
              </div>
            </div>

            <div class="form-group">
              <label>Localisation</label>
              <input type="text" [(ngModel)]="resForm.location" placeholder="Ex: 2ème étage, Aile B" class="form-control" />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="resForm.description" class="form-control" rows="2"></textarea>
            </div>

            <div class="form-group">
              <label>URL Photo (séparées par une virgule)</label>
              <input type="text" [ngModel]="resForm.photos.join(', ')" (ngModelChange)="updatePhotos($event)" placeholder="https://..., https://..." class="form-control" />
              @if (resForm.photos.length) {
                <div class="photo-preview mt-2">
                  @for (p of resForm.photos; track p) { <img [src]="p" alt="preview" /> }
                </div>
              }
            </div>

            <div class="form-group">
              <label>Équipements</label>
              <div class="amenities-selector">
                @for (a of availableAmenities; track a) {
                  <button type="button" class="btn btn-sm"
                    [class.btn-primary-light]="resForm.amenities.includes(a)"
                    [class.btn-outline]="!resForm.amenities.includes(a)"
                    (click)="toggleAmenity(a)">
                    {{ a }}
                  </button>
                }
              </div>
            </div>

            <div class="form-group toggle-group mt-4">
              <label>Statut opérationnel</label>
              <select [(ngModel)]="resForm.status" class="form-control" style="width:140px">
                <option value="available">Par défaut (Libre)</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div class="form-actions mt-6">
              @if (editingResource()) {
                <button class="btn btn-ghost" (click)="cancelEdit()">Annuler</button>
              }
              <button class="btn btn-primary flex-1" (click)="saveResource()" [disabled]="!resForm.name || isSaving()">
                @if(isSaving()) { <span class="spinner-sm"></span> }
                {{ editingResource() ? 'Enregistrer' : 'Créer la salle' }}
              </button>
            </div>
          </section>

          <!-- List -->
          <section class="resources-list">
            <div class="flex justify-between items-center mb-4">
              <h3 class="section-title mb-0">Catalogue des Salles</h3>
              <button (click)="loadResources()" class="btn btn-outline btn-sm">↻ Actu.</button>
            </div>

            @if (isLoadingResources()) {
              <div class="py-12"><div class="spinner"></div></div>
            } @else {
              <div class="admin-room-grid">
                @for (res of resources(); track res._id) {
                  <div class="admin-room-card glass card" [class.is-maint]="res.status === 'maintenance'">
                     <div class="arc-header">
                       <h4 class="font-bold text-lg truncate">{{ res.name }}</h4>
                       <span class="badge" [class]="'badge-' + res.status">{{ getResStatusLabel(res.status) }}</span>
                     </div>
                     <p class="text-sm text-muted mb-2 truncate">📍 {{ res.location || 'N/A' }} — 👥 {{ res.capacity }}</p>
                     <p class="text-sm text-primary font-bold mb-3">{{ res.pricePerHour | number }} Ar / heure</p>

                     <div class="arc-actions pt-3 border-t">
                       <button class="btn btn-outline btn-sm" (click)="editResource(res)">Modifier</button>
                       <button class="btn btn-danger-outline btn-sm" (click)="deleteResource(res._id)">Suppr</button>
                     </div>
                  </div>
                }
              </div>
            }
          </section>
        </div>
      }

      <!-- TAB 3: BOOKINGS & PAYMENTS -->
      @if (activeTab() === 'bookings') {
        <div class="bookings-layout animate-in">
           <div class="table-controls mb-4 glass card p-4 flex justify-between items-center">
             <div class="filters flex gap-2">
               <button class="chip" [class.active]="filterStatus() === 'all'" (click)="filterStatus.set('all')">Tous</button>
               <button class="chip" [class.active]="filterStatus() === 'pending'" (click)="filterStatus.set('pending')">En attente</button>
               <button class="chip" [class.active]="filterStatus() === 'confirmed'" (click)="filterStatus.set('confirmed')">Confirmés</button>
             </div>
             <button (click)="loadBookings()" class="btn btn-outline btn-sm">↻ Actualiser le tableau</button>
           </div>

           <div class="table-container card-elevated">
             <table class="admin-table">
               <thead>
                 <tr>
                   <th>Référence</th>
                   <th>Client</th>
                   <th>Salle & Créneau</th>
                   <th>Paiement</th>
                   <th>Statut Résa.</th>
                   <th class="text-right">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 @for (booking of filteredBookings(); track booking._id) {
                   <tr [class.row-highlight]="recentUpdates().has(booking._id)">
                     <td>
                        <span class="text-xs text-muted font-mono">{{ $any(booking).invoiceNumber || 'N/A' }}</span>
                     </td>
                     <td>
                        <div class="font-bold">{{ booking.userName }}</div>
                        <div class="text-xs text-muted">{{ booking.userId.substring(0,8) }}...</div>
                     </td>
                     <td>
                        <div class="font-semibold text-primary">{{ booking.resourceName }}</div>
                        <div class="text-sm">{{ booking.startTime | date:'dd/MM/yyyy HH:mm' }}</div>
                     </td>
                     <td>
                        <div class="font-bold">{{ $any(booking).paymentAmount | number }} Ar</div>
                        <span class="badge" [class]="'badge-' + ($any(booking).paymentStatus || 'unpaid')">
                          {{ getPaymentLabel($any(booking).paymentStatus) }}
                        </span>
                     </td>
                     <td>
                        <span class="badge" [class]="'badge-' + booking.status">{{ getBookingStatusLabel(booking.status) }}</span>
                     </td>
                     <td class="text-right">
                        @if (booking.status === 'pending') {
                           <button class="btn btn-icon btn-success-light mr-1" title="Confirmer" (click)="updateBookingStatus(booking._id, 'confirmed')">✓</button>
                        }
                        @if (booking.status !== 'cancelled') {
                           <button class="btn btn-icon btn-danger-light" title="Annuler" (click)="updateBookingStatus(booking._id, 'cancelled')">✕</button>
                        }
                     </td>
                   </tr>
                 } @empty {
                   <tr><td colspan="6" class="text-center py-12 text-muted">Aucune réservation trouvée dans cette catégorie.</td></tr>
                 }
               </tbody>
             </table>
           </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-page { padding: 0 24px 80px; max-width: 1400px; margin: 0 auto; }
    .admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin: 32px 0 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
    .admin-nav { display: flex; gap: 8px; background: white; padding: 6px; border-radius: 16px; width: fit-content; box-shadow: var(--shadow-sm); border: 1px solid var(--border); }
    .nav-tab { padding: 10px 20px; border: none; background: transparent; font-weight: 600; color: var(--text-muted); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
    .nav-tab.active { background: var(--primary-light); color: var(--primary); }
    .nav-tab:not(.active):hover { background: var(--surface-2); }

    /* KPI */
    .overview-grid { }
    .charts-area { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-top: 24px; }
    @media (max-width: 1024px) { .charts-area { grid-template-columns: 1fr; } }
    .kpi-card { display: flex; align-items: center; gap: 16px; padding: 20px; }
    .kpi-icon { width: 56px; height: 56px; border-radius: 16px; font-size: 1.5rem; }
    .kpi-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 4px; }
    .kpi-val { font-size: 1.8rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }

    /* CHARTS */
    .chart-box { padding: 24px; }
    .chart-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 24px; color: var(--text-secondary); }
    
    .css-bar-chart { display: flex; align-items: flex-end; justify-content: space-around; height: 200px; padding-top: 20px; }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 10%; height: 100%; justify-content: flex-end; }
    .bar-fill { width: 100%; background: var(--gradient-brand); border-radius: 6px 6px 0 0; position: relative; transition: height 1s var(--ease-spring); min-height: 4px; }
    .bar-label { font-size: 0.75rem; color: var(--text-faint); font-weight: 600; }
    .bar-tooltip { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; opacity: 0; transition: opacity 0.2s; pointer-events: none; white-space: nowrap; }
    .bar-fill:hover .bar-tooltip { opacity: 1; }

    .css-pie-chart { width: 180px; height: 180px; border-radius: 50%; background: #e2e8f0; margin: 0 auto; position: relative; display: flex; align-items: center; justify-content: center; }
    .pie-hole { width: 120px; height: 120px; background: white; border-radius: 50%; }
    .pie-legend { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; font-size: 0.85rem; font-weight: 600; }
    .ldot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 4px; }
    .ldot.available { background: var(--success); }
    .ldot.reserved { background: var(--warning); }
    .ldot.maint { background: var(--danger); }

    /* RESOURCES TAB */
    .resources-layout { display: grid; grid-template-columns: 420px 1fr; gap: 32px; align-items: start; }
    @media(max-width: 900px) { .resources-layout { grid-template-columns: 1fr; } }
    .resource-form-section { padding: 28px; }
    .amenities-selector { display: flex; flex-wrap: wrap; gap: 8px; }
    .photo-preview { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .photo-preview img { width: 60px; height: 45px; object-fit: cover; border-radius: 6px; }

    .admin-room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .admin-room-card { padding: 20px; }
    .admin-room-card.is-maint { opacity: 0.7; border: 1px dashed var(--danger); }
    .arc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 12px; }

    .bg-blue-100 { background-color: #dbeafe; } .text-blue-600 { color: #2563eb; }
    .bg-green-100 { background-color: #dcfce7; } .text-green-600 { color: #16a34a; }
    .bg-purple-100 { background-color: #f3e8ff; } .text-purple-600 { color: #9333ea; }
    .bg-amber-100 { background-color: #fef3c7; } .text-amber-600 { color: #d97706; }
    .border-t { border-top: 1px solid var(--border); }
    .pt-3 { padding-top: 12px; }
    .mr-1 { margin-right: 4px; }
  `]
})
export class DashboardAdminComponent implements OnInit {
  protected readonly BookingStatus = BookingStatus;
  
  private bookingService = inject(BookingService);
  private socketService = inject(SocketService);
  private http = inject(HttpClient);

  activeTab = signal<'overview'|'resources'|'bookings'>('overview');
  
  generalStats = signal<any>(null);
  paymentStats = signal<any>(null);
  resourceStats = signal<any>(null);

  resources = signal<Resource[]>([]);
  allBookings = signal<Booking[]>([]);
  filterStatus = signal<'all'|'pending'|'confirmed'>('all');
  
  isLoadingResources = signal(false);
  isSaving = signal(false);
  editingResource = signal<Resource|null>(null);
  
  recentUpdates = signal<Set<string>>(new Set());
  toasts = signal<any[]>([]);
  toastCounter = 0;
  wsConnected = signal(false);

  availableAmenities = ['WiFi', 'Projecteur', 'Tableau blanc', 'Climatisation', 'Visioconférence', 'Imprimante', 'Cuisine', 'Parking'];
  resForm = { name: '', description: '', capacity: 10, available: true, status: 'available', pricePerHour: 0, location: '', photos: [] as string[], amenities: [] as string[] };

  filteredBookings = computed(() => {
    const s = this.filterStatus();
    return s === 'all' ? this.allBookings() : this.allBookings().filter(b => b.status === s);
  });

  constructor() {
    effect(() => {
      const update = this.socketService.adminUpdate();
      if (update) this.handleRealtimeUpdate(update);
    });
  }

  ngOnInit() {
    this.loadAllData();
    this.socketService.connect();
    this.wsConnected.set(true);
  }

  loadAllData() {
    this.loadResources();
    this.loadBookings();
    this.loadStats();
  }

  loadStats() {
    this.http.get(`${environment.apiUrl}/api/bookings/stats`).subscribe(d => this.generalStats.set(d));
    this.http.get(`${environment.apiUrl}/api/payments/stats`).subscribe(d => this.paymentStats.set(d));
    this.http.get(`${environment.apiUrl}/api/resources/stats`).subscribe(d => this.resourceStats.set(d));
  }

  loadResources() {
    this.isLoadingResources.set(true);
    this.http.get<Resource[]>(`${environment.apiUrl}/api/resources`).subscribe({
       next: d => { this.resources.set(d); this.isLoadingResources.set(false); },
       error: () => this.isLoadingResources.set(false)
    });
  }

  loadBookings() {
    this.bookingService.getAllBookings().subscribe(d => this.allBookings.set(d));
  }

  /* REVENUES CHART LOGIC */
  getBarHeight(amount: number) {
    const stats = this.paymentStats();
    if (!stats || !stats.monthlyRevenue) return '0%';
    const max = Math.max(...stats.monthlyRevenue.map((m: any) => m.amount));
    if (max === 0) return '0%';
    return `${Math.max((amount / max) * 100, 2)}%`;
  }

  getPieStyles() {
    const s = this.resourceStats();
    if (!s || s.total === 0) return 'background: #e2e8f0;';
    const p1 = (s.available / s.total) * 100;
    const p2 = p1 + ((s.reserved / s.total) * 100);
    return `background: conic-gradient(var(--success) 0% ${p1}%, var(--warning) ${p1}% ${p2}%, var(--danger) ${p2}% 100%);`;
  }

  /* FORMS & ACTIONS */
  toggleAmenity(a: string) {
    const arr = this.resForm.amenities;
    if (arr.includes(a)) this.resForm.amenities = arr.filter(x => x !== a);
    else this.resForm.amenities.push(a);
  }

  updatePhotos(val: string) {
    this.resForm.photos = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  saveResource() {
    this.isSaving.set(true);
    const ed = this.editingResource();
    const req = ed ? this.http.patch(`${environment.apiUrl}/api/resources/${ed._id}`, this.resForm)
                 : this.http.post(`${environment.apiUrl}/api/resources`, this.resForm);
                 
    req.subscribe({
       next: () => {
         this.isSaving.set(false);
         this.showToast(ed ? 'Salle modifiée' : 'Salle créée', 'success');
         this.cancelEdit();
         this.loadResources();
         this.loadStats();
       },
       error: () => { this.isSaving.set(false); this.showToast('Erreur serveur', 'error'); }
    });
  }

  editResource(r: Resource) {
    this.editingResource.set(r);
    this.resForm = {
      name: r.name, description: r.description, capacity: r.capacity, available: r.available,
      status: r.status || 'available', pricePerHour: r.pricePerHour || 0,
      location: r.location || '', photos: [...(r.photos || [])], amenities: [...(r.amenities || [])]
    };
  }

  cancelEdit() {
    this.editingResource.set(null);
    this.resForm = { name: '', description: '', capacity: 10, available: true, status: 'available', pricePerHour: 0, location: '', photos: [], amenities: [] };
  }

  deleteResource(id: string) {
    if(confirm('Supprimer définitivement ?')) {
       this.http.delete(`${environment.apiUrl}/api/resources/${id}`).subscribe({
         next: () => { this.showToast('Salle supprimée', 'info'); this.loadResources(); this.loadStats(); }
       });
    }
  }

  updateBookingStatus(id: string, st: string) {
    this.bookingService.updateStatus(id, { status: st as BookingStatus }).subscribe();
  }

  handleRealtimeUpdate(payload: any) {
     const { event, booking } = payload;
     if (booking) {
       this.recentUpdates.update(s => { const n = new Set(s); n.add(booking._id); return n; });
       setTimeout(() => this.recentUpdates.update(s => { const n = new Set(s); n.delete(booking._id); return n; }), 3000);
       
       if (event === 'booking:created') this.allBookings.update(l => [booking, ...l]);
       else this.allBookings.update(l => l.map(b => b._id === booking._id ? booking : b));
       
       this.showToast(`Réservation ${booking._id.substring(0,6)} mise à jour`, 'info');
       this.loadStats();
     }
  }

  /* UTILS */
  getResStatusLabel(s: string) { return { available: 'Libre', reserved: 'Occupée', maintenance: 'Maintenance' }[s] ?? s; }
  getBookingStatusLabel(s: string) { return { pending: 'En att.', confirmed: 'Confirmé', cancelled: 'Annulé' }[s] ?? s; }
  getPaymentLabel(s: string) { return { unpaid: 'Non payé', pending: 'En att.', paid: 'Payé', refunded: 'Remboursé' }[s] ?? s; }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = ++this.toastCounter;
    this.toasts.update(t => [...t, { id, message, type, leaving: false }]);
    setTimeout(() => {
      this.toasts.update(t => t.map(x => x.id === id ? { ...x, leaving: true } : x));
      setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 400);
    }, 3500);
  }
}