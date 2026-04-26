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
  amenities: string[];
  rules: string;
  location: string;
  pricePerHour: number;
  status: 'available' | 'reserved' | 'maintenance';
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  leaving: boolean;
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
             <span class="kpi-icon flex items-center justify-center bg-yellow-100 text-yellow-600">💸</span>
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
             <span class="kpi-icon flex items-center justify-center bg-violet-100 text-violet-600">🏢</span>
             <div class="kpi-info">
               <span class="kpi-label">Salles Actives</span>
               <span class="kpi-val">{{ resourceStats()?.available ?? '-' }}/{{ resourceStats()?.total ?? '-' }}</span>
             </div>
          </div>

          <!-- Charts Area -->
          <div class="charts-area">
             <div class="chart-box glass full-width">
                <h3 class="chart-title">Revenus des 6 derniers mois</h3>
                <div class="css-bar-chart">
                  @for (stat of paymentStats()?.monthlyRevenue; track stat.month) {
                    <div class="bar-col">
                      <div class="bar-fill" [style.height]="getBarHeight(stat.amount)">
                        <div class="bar-tooltip">{{ stat.amount | number }} Ar</div>
                      </div>
                      <span class="bar-label">{{ stat.month | slice:5:7 }}/{{ stat.month | slice:2:4 }}</span>
                    </div>
                  }
                </div>
             </div>
          </div>

          <div class="status-area mt-8">
             <div class="chart-box glass">
               <h3 class="chart-title">Statut des Salles</h3>
               <div class="pie-layout">
                 <div class="css-pie-chart" [style]="getPieStyles()">
                   <div class="pie-hole"></div>
                 </div>
                 <div class="pie-legend">
                   <div class="legend-item"><span class="ldot available"></span> Libre ({{ resourceStats()?.available ?? 0 }})</div>
                   <div class="legend-item"><span class="ldot reserved"></span> Occupée ({{ resourceStats()?.reserved ?? 0 }})</div>
                   <div class="legend-item"><span class="ldot maint"></span> Maint. ({{ resourceStats()?.maintenance ?? 0 }})</div>
                 </div>
               </div>
             </div>
             
             <!-- Emplacement pour un futur graphique ou info -->
             <div class="chart-box glass" style="justify-content: center; align-items: center; opacity: 0.5; border: 1px dashed var(--border-subtle);">
                <p class="text-muted">Statistiques Supplémentaires</p>
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
              <label>Image de la salle</label>
              <div class="image-note">
                La sélection d’images a été désactivée pour améliorer les performances côté utilisateur.
              </div>
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

           <div class="booking-grid">
             @for (booking of filteredBookings(); track booking._id) {
               <div class="booking-card animate-in" [class.new-update]="recentUpdates().has(booking._id)">
                 <div class="booking-card-overlay">
                   <div class="bc-header">
                     <span class="invoice-num">{{ booking.invoiceNumber || 'N/A' }}</span>
                     <span class="badge" [class]="'badge-' + booking.status">{{ getBookingStatusLabel(booking.status) }}</span>
                   </div>
                   
                   <div class="bc-content">
                     <h4 class="resource-name">{{ booking.resourceName }}</h4>
                     <p class="booking-time">📅 {{ booking.startTime | date:'dd MMM yyyy, HH:mm' }}</p>
                     
                     <div class="client-info mt-3">
                       <div class="client-avatar">{{ booking.userName.substring(0,1) }}</div>
                       <div>
                         <div class="client-name">{{ booking.userName }}</div>
                         <div class="client-id">ID: {{ booking.userId.substring(0,8) }}...</div>
                       </div>
                     </div>
                   </div>

                   <div class="bc-footer">
                     <div class="payment-info">
                       <span class="amount">{{ booking.paymentAmount | number }} Ar</span>
                       <span class="p-status" [class]="booking.paymentStatus || 'unpaid'">
                         {{ getPaymentLabel(booking.paymentStatus || 'unpaid') }}
                       </span>
                     </div>
                     
                     <div class="bc-actions">
                       @if (booking.status === 'pending') {
                          <button class="btn btn-icon btn-success-light" title="Confirmer" (click)="updateBookingStatus(booking._id, 'confirmed')">✓</button>
                       }
                       @if (booking.status !== 'cancelled') {
                          <button class="btn btn-icon btn-danger-light" title="Annuler" (click)="updateBookingStatus(booking._id, 'cancelled')">✕</button>
                       }
                     </div>
                   </div>
                 </div>
               </div>
             } @empty {
               <div class="empty-state text-center py-20 w-full glass card">
                 <p class="text-muted">Aucune réservation trouvée dans cette catégorie.</p>
               </div>
             }
           </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-page { padding: 0 40px 80px; width: 100%; max-width: 100%; position: relative; z-index: 2; margin: 0; }
    .admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin: 32px 0 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border-subtle); }
    .admin-nav { display: flex; gap: 8px; background: var(--bg-surface); padding: 8px; border-radius: 20px; width: fit-content; box-shadow: var(--shadow-md); border: 1px solid var(--border-subtle); backdrop-filter: blur(10px); }
    .nav-tab { padding: 12px 24px; border: none; background: transparent; font-weight: 700; color: var(--text-muted); border-radius: 14px; cursor: pointer; transition: all var(--transition-base); font-family: var(--font-display); font-size: 0.9rem; }
    .nav-tab.active { background: var(--gradient-brand); color: white; box-shadow: 0 4px 15px var(--brand-glow); }
    .nav-tab:not(.active):hover { background: var(--bg-elevated); color: var(--text-secondary); }

    .charts-area { display: grid; grid-template-columns: 1fr; gap: 40px; margin-top: 40px; width: 100%; }
    .status-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    @media (max-width: 1300px) { .status-area { grid-template-columns: 1fr; } }
    .kpi-card { display: flex; align-items: center; gap: 20px; padding: 24px; border-radius: var(--radius-lg); background: var(--gradient-card); border: 1px solid var(--border-subtle); position: relative; overflow: hidden; }
    .kpi-card::after { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, var(--secondary-subtle) 0%, transparent 70%); opacity: 0.3; pointer-events: none; }
    .kpi-icon { width: 64px; height: 64px; border-radius: 18px; font-size: 1.8rem; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 10px rgba(255,255,255,0.1); }
    .kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-weight: 800; display: block; margin-bottom: 6px; }
    .kpi-val { font-size: 2.2rem; font-weight: 800; color: var(--text-primary); line-height: 1; font-family: var(--font-display); }

    /* CHARTS */
    .chart-box { padding: 36px; min-height: 480px; display: flex; flex-direction: column; }
    .chart-box.full-width { grid-column: 1 / -1; }
    .chart-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 40px; color: var(--text-secondary); font-family: var(--font-display); }
    
    .css-bar-chart { display: flex; align-items: flex-end; justify-content: space-around; height: 320px; padding: 20px 40px 0; border-bottom: 2px solid var(--border-subtle); margin-bottom: 20px; flex: 1; }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: 14px; width: 10%; height: 100%; justify-content: flex-end; }
    .bar-fill { width: 100%; background: var(--gradient-aurora); border-radius: 14px 14px 0 0; position: relative; transition: all 1s var(--ease-spring); min-height: 8px; box-shadow: 0 12px 30px var(--secondary-glow); }
    .bar-label { font-size: 1rem; color: var(--text-secondary); font-weight: 800; padding: 14px 0; }
    .bar-fill:hover { filter: brightness(1.15); transform: scaleX(1.02) translateY(-2px); box-shadow: 0 15px 35px var(--secondary-glow); }

    /* Pie / Status Chart */
    .pie-layout { display: flex; align-items: center; gap: 32px; flex: 1; justify-content: center; width: 100%; }
    @media (max-width: 1400px) { .pie-layout { flex-direction: column; } }
    
    .css-pie-chart { width: 280px; height: 280px; border-radius: 50%; background: var(--bg-elevated); position: relative; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-xl), inset 0 0 30px rgba(0,0,0,0.6); flex-shrink: 0; }
    .pie-hole { width: 190px; height: 190px; background: var(--bg-surface); border-radius: 50%; box-shadow: inset 0 0 20px rgba(0,0,0,0.5); }
    .pie-legend { display: flex; flex-direction: column; gap: 20px; flex: 1; min-width: 180px; padding: 20px 0; }
    .legend-item { display: flex; align-items: center; font-size: 1rem; font-weight: 700; color: var(--text-secondary); white-space: nowrap; }
    .ldot { width: 12px; height: 12px; border-radius: 4px; display: inline-block; margin-right: 12px; }
    .ldot.available { background: var(--success); box-shadow: 0 0 10px var(--success-bg); }
    .ldot.reserved { background: var(--warning); box-shadow: 0 0 10px var(--warning-bg); }
    .ldot.maint { background: var(--danger); box-shadow: 0 0 10px var(--danger-bg); }

    /* RESOURCES TAB */
    .resources-layout { display: grid; grid-template-columns: 440px 1fr; gap: 40px; align-items: start; }
    @media(max-width: 1100px) { .resources-layout { grid-template-columns: 1fr; } }
    .resource-form-section { padding: 32px; background: var(--gradient-card); }
    .amenities-selector { display: flex; flex-wrap: wrap; gap: 10px; }
    .image-note { color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; padding: 12px 14px; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 16px; }

    .admin-room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
    .admin-room-card { padding: 24px; background: var(--bg-surface); border: 1px solid var(--border-subtle); transition: all 0.3s; }
    .admin-room-card:hover { border-color: var(--border-brand); transform: translateY(-5px); box-shadow: var(--shadow-lg); }
    .admin-room-card.is-maint { opacity: 0.6; grayscale: 1; border: 1px dashed var(--danger); }
    .arc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }

    .bg-blue-100 { background: var(--info-bg); } .text-blue-600 { color: var(--info); }
    .bg-yellow-100 { background: var(--success-bg); } .text-yellow-600 { color: var(--success); }
    .bg-purple-100 { background: var(--secondary-subtle); } .text-purple-600 { color: var(--secondary); }
    .bg-violet-100 { background: var(--secondary-subtle); } .text-violet-600 { color: var(--secondary); }
    .bg-amber-100 { background: var(--brand-subtle); } .text-amber-600 { color: var(--brand); }
    .border-t { border-top: 1px solid var(--border-subtle); }
    .pt-3 { padding-top: 16px; }
    .mr-1 { margin-right: 6px; }

    /* BOOKING CARDS */
    .booking-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 32px; }
    .booking-card { 
      height: 300px; 
      border-radius: var(--radius-lg); 
      background-size: cover; 
      background-position: center; 
      position: relative; 
      overflow: hidden; 
      box-shadow: var(--shadow-lg);
      transition: all 0.4s var(--ease-spring);
      cursor: pointer;
      border: 1px solid var(--border-subtle);
    }
    .booking-card:hover { transform: translateY(-12px) scale(1.02); box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 20px var(--secondary-glow); border-color: var(--border-brand); }
    .booking-card-overlay { 
      position: absolute; inset: 0; 
      background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(10,9,16,0.95) 100%);
      padding: 28px; display: flex; flex-direction: column; justify-content: space-between;
      backdrop-filter: blur(1px);
      transition: all 0.4s;
    }
    .booking-card:hover .booking-card-overlay { backdrop-filter: blur(0px); background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(10,9,16,0.98) 100%); }
    
    .bc-header { display: flex; justify-content: space-between; align-items: center; }
    .invoice-num { font-family: 'Outfit', monospace; font-size: 0.8rem; font-weight: 700; color: white; background: rgba(0,0,0,0.6); padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
    
    .resource-name { font-size: 1.75rem; font-weight: 800; color: white; margin-bottom: 6px; text-shadow: 0 3px 6px rgba(0,0,0,0.8); font-family: var(--font-display); line-height: 1.1; }
    .booking-time { font-size: 0.95rem; color: var(--text-secondary); font-weight: 600; display: flex; align-items: center; gap: 8px; }
    
    .client-info { display: flex; align-items: center; gap: 14px; }
    .client-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--gradient-aurora); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
    .client-name { font-weight: 700; color: white; font-size: 1rem; }
    .client-id { font-size: 0.8rem; color: var(--text-muted); }
    
    .bc-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; }
    .payment-info { display: flex; flex-direction: column; gap: 4px; }
    .amount { font-size: 1.5rem; font-weight: 800; color: var(--brand); font-family: var(--font-display); }
    .p-status { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; width: fit-content; }
    .p-status.paid { color: var(--success); border: 1px solid var(--success-border); }
    .p-status.unpaid { color: var(--danger); border: 1px solid var(--danger-border); }
    .p-status.pending { color: var(--warning); border: 1px solid var(--warning-border); }
    
    .bc-actions { display: flex; gap: 10px; }
    
    .animate-in { animation: fadeInUp 0.7s var(--ease-spring) both; }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .new-update { animation: pulseBorder 2s infinite; border: 2px solid var(--brand); }
    @keyframes pulseBorder {
      0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
      70% { box-shadow: 0 0 0 15px rgba(245, 158, 11, 0); }
      100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
    }
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
  toasts = signal<Toast[]>([]);
  toastCounter = 0;
  wsConnected = signal(false);

  availableAmenities = ['WiFi', 'Projecteur', 'Tableau blanc', 'Climatisation', 'Visioconférence', 'Imprimante', 'Cuisine', 'Parking'];
  resForm = { name: '', description: '', capacity: 10, available: true, status: 'available', pricePerHour: 0, location: '', amenities: [] as string[] };

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
      location: r.location || '', amenities: [...(r.amenities || [])]
    };
  }

  cancelEdit() {
    this.editingResource.set(null);
    this.resForm = { name: '', description: '', capacity: 10, available: true, status: 'available', pricePerHour: 0, location: '', amenities: [] };
  }

  deleteResource(id: string) {
    if(confirm('Supprimer définitivement ?')) {
       this.http.delete(`${environment.apiUrl}/api/resources/${id}`).subscribe({
         next: () => { this.showToast('Salle supprimée', 'info'); this.loadResources(); this.loadStats(); }
       });
    }
  }

  updateBookingStatus(id: string, st: string) {
    // Récupérer la réservation courante pour obtenir la version
    const booking = this.allBookings().find(b => b._id === id);
    if (!booking) {
      this.showToast('Réservation introuvable', 'error');
      return;
    }
    this.bookingService.updateStatus(id, { status: st as BookingStatus, version: booking.version }).subscribe({
      next: (updatedBooking) => {
        // Mise à jour optimiste immédiate
        this.allBookings.update(l => l.map(b => b._id === id ? updatedBooking : b));
        this.showToast('Statut mis à jour', 'success');
        // Le WebSocket confirmera la mise à jour
      },
      error: (err) => {
        if (err?.error?.message?.includes('modifiée par une autre requête') || err?.status === 409) {
          this.showToast('Conflit de version, rechargez la page', 'error');
        } else {
          this.showToast('Erreur lors de la mise à jour', 'error');
        }
      }
    });
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
    
    // Use local references to help compiler and avoid closure issues
    const currentToasts = this.toasts;
    setTimeout(() => {
      currentToasts.update(t => t.map(x => x.id === id ? { ...x, leaving: true } : x));
      setTimeout(() => currentToasts.update(t => t.filter(x => x.id !== id)), 400);
    }, 3500);
  }
}