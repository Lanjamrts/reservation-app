import {
  Component, signal, OnInit, inject, OnDestroy, effect,
  computed, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
  photos: string[];
  amenities: string[];
  rules: string;
  location: string;
  pricePerHour: number;
  status: 'available' | 'reserved' | 'maintenance';
}

interface DayBooking {
  _id: string;
  startTime: string;
  endTime: string;
  userName: string;
  status: string;
}

interface ResourceWithBookings extends Resource {
  todayBookings: DayBooking[];
}

@Component({
  selector: 'app-booking-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <!-- ═══════════════════════════════════════════════
         TOAST CONTAINER
    ═══════════════════════════════════════════════ -->
    <div class="toast-container" aria-live="polite">
      @for (t of toasts(); track t.id) {
        <div class="toast" [class]="'toast-' + t.type" [class.out]="t.leaving">
          <span class="toast-icon">
            @if (t.type === 'success') { ✓ }
            @else if (t.type === 'error') { ✕ }
            @else { i }
          </span>
          <span>{{ t.message }}</span>
        </div>
      }
    </div>

    <!-- ═══════════════════════════════════════════════
         BOOKING MODAL
    ═══════════════════════════════════════════════ -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">

          <!-- Glow line -->
          <div class="modal-glow-line" aria-hidden="true"></div>

          <div class="modal-header">
            <div>
              <h2 class="modal-title">Nouvelle réservation</h2>
              @if (selectedResource(); as r) {
                <p class="modal-subtitle">
                  <span class="modal-subtitle-dot"></span>
                  {{ r.name }}
                </p>
              }
            </div>
            <button class="modal-close" (click)="closeModal()" aria-label="Fermer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          @if (selectedResource(); as res) {

            <!-- Resource preview card -->
            <div class="modal-resource-card">
              <div class="modal-resource-thumb">
                @if (res.photos?.length) {
                  <img [src]="res.photos[0]" [alt]="res.name" (error)="onImgError($event)" />
                } @else {
                  <div class="modal-thumb-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
                  </div>
                }
              </div>
              <div class="modal-resource-meta">
                <div class="modal-resource-name">{{ res.name }}</div>
                @if (res.location) {
                  <div class="modal-resource-loc">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ res.location }}
                  </div>
                }
                <div class="modal-resource-chips">
                  <span class="modal-chip">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                    {{ res.capacity }} pers.
                  </span>
                  @if (res.pricePerHour > 0) {
                    <span class="modal-chip modal-chip-price">
                      {{ res.pricePerHour | number }} Ar/h
                    </span>
                  }
                </div>
              </div>
            </div>

            <!-- Timeline inside modal -->
            <div class="modal-timeline-block">
              <div class="block-label">Disponibilité aujourd'hui</div>
              <div class="modal-tl-track">
                @for (slot of getTodayTimeline(res._id); track slot.hour) {
                  <div
                    class="modal-tl-cell"
                    [class.busy]="slot.busy"
                    [class.partial]="slot.partial"
                    [title]="(slot.busy ? 'Occupé — ' : 'Libre — ') + slot.label">
                  </div>
                }
              </div>
              <div class="modal-tl-labels">
                <span>8h</span><span>11h</span><span>14h</span><span>17h</span><span>20h</span>
              </div>
              <div class="modal-tl-legend">
                <span class="tl-leg-free">Libre</span>
                <span class="tl-leg-partial">Partiel</span>
                <span class="tl-leg-busy">Occupé</span>
              </div>
            </div>

            <!-- Form -->
            <form (ngSubmit)="onBookingSubmit()" class="modal-form">

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="m-start">Début</label>
                  <input id="m-start" type="datetime-local" name="startTime"
                    [(ngModel)]="newBooking.startTime"
                    (change)="recalculateAmount()"
                    required class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="m-end">Fin</label>
                  <input id="m-end" type="datetime-local" name="endTime"
                    [(ngModel)]="newBooking.endTime"
                    (change)="recalculateAmount()"
                    required class="form-control" />
                </div>
              </div>

              <!-- Cost summary -->
              @if (estimatedAmount() > 0) {
                <div class="cost-card animate-in">
                  <div class="cost-row">
                    <span class="cost-lbl">Durée</span>
                    <span class="cost-val">{{ estimatedDuration() }}h</span>
                  </div>
                  <div class="cost-row">
                    <span class="cost-lbl">Tarif horaire</span>
                    <span class="cost-val">{{ res.pricePerHour | number }} Ar/h</span>
                  </div>
                  <div class="cost-divider"></div>
                  <div class="cost-row cost-row-total">
                    <span>Total estimé</span>
                    <span class="cost-total-val">{{ estimatedAmount() | number }} Ar</span>
                  </div>
                  <div class="cost-row cost-row-deposit">
                    <span>Acompte requis (30%)</span>
                    <span>{{ (estimatedAmount() * 0.3) | number }} Ar</span>
                  </div>
                </div>
              }

              <div class="form-group">
                <label class="form-label" for="m-notes">Notes (optionnel)</label>
                <textarea id="m-notes" name="notes" [(ngModel)]="newBooking.notes"
                  placeholder="Nombre de participants, besoins spécifiques…"
                  class="form-control" rows="2"></textarea>
              </div>

              @if (bookingError()) {
                <div class="alert alert-error animate-in">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ bookingError() }}
                </div>
              }

              <div class="modal-actions">
                <button type="button" class="btn btn-outline" (click)="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-brand btn-lg"
                  [class.loading]="isSubmitting()"
                  [disabled]="!newBooking.startTime || !newBooking.endTime || isSubmitting()">
                  @if (!isSubmitting()) {
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Confirmer
                  }
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════════════
         MAIN PAGE
    ═══════════════════════════════════════════════ -->
    <div class="page-wrap">

      <!-- ── HERO ─────────────────────────────────────── -->
      <section class="hero animate-in">
        <div class="hero-bg" aria-hidden="true">
          <div class="hero-orb hero-orb-1"></div>
          <div class="hero-orb hero-orb-2"></div>
          <div class="hero-grid"></div>
        </div>
        <div class="hero-body">
          <div class="hero-greeting animate-in animate-in-delay-1">
            <span class="greeting-wave">👋</span>
            Bonjour, <strong>{{ currentUser()?.username || 'Utilisateur' }}</strong>
          </div>
          <h1 class="hero-title animate-in animate-in-delay-2">
            Réservez votre espace
          </h1>
          <p class="hero-sub animate-in animate-in-delay-3">
            Parcourez nos salles, visualisez les créneaux libres et réservez en quelques secondes.
          </p>

          <div class="hero-kpis animate-in animate-in-delay-4">
            <div class="kpi">
              <div class="kpi-val">{{ myActiveBookings() }}</div>
              <div class="kpi-lbl">Réservations actives</div>
            </div>
            <div class="kpi-sep"></div>
            <div class="kpi">
              <div class="kpi-val">{{ resourcesWithBookings().length }}</div>
              <div class="kpi-lbl">Salles disponibles</div>
            </div>
            @if (nextBooking(); as nb) {
              <div class="kpi-sep"></div>
              <div class="kpi">
                <div class="kpi-val">{{ nb.startTime | date:'HH:mm' }}</div>
                <div class="kpi-lbl">{{ nb.resourceName }} — prochaine</div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ── ROOMS SECTION ─────────────────────────────── -->
      <section class="rooms-section animate-in animate-in-delay-2">

        <div class="section-head">
          <div class="section-head-left">
            <h2 class="section-h">Nos Salles</h2>
            <p class="section-sub">Faites défiler pour découvrir toutes les salles et leurs disponibilités</p>
          </div>
          <!-- WS live indicator -->
          <div class="ws-pill" [class.live]="wsConnected()">
            <span class="ws-dot-el"></span>
            {{ wsConnected() ? 'En direct' : 'Hors ligne' }}
          </div>
        </div>

        <!-- Skeleton loader -->
        @if (isLoadingResources()) {
          <div class="rooms-grid">
            @for (i of [1,2,3]; track i) {
              <div class="room-card room-card-skeleton">
                <div class="skeleton skeleton-image" style="height:200px;border-radius:0"></div>
                <div style="padding:22px;display:flex;flex-direction:column;gap:12px">
                  <div class="skeleton skeleton-title" style="width:55%"></div>
                  <div class="skeleton skeleton-text" style="width:80%"></div>
                  <div class="skeleton skeleton-text" style="width:40%"></div>
                  <div class="skeleton" style="height:32px;margin-top:8px"></div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty state -->
        @else if (resourcesWithBookings().length === 0) {
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <div class="empty-state-title">Aucune salle disponible</div>
            <p class="empty-state-desc">Revenez bientôt, de nouvelles salles seront ajoutées par l'administrateur.</p>
          </div>
        }

        <!-- Rooms grid -->
        @else {
          <div class="rooms-grid">
            @for (res of resourcesWithBookings(); track res._id; let i = $index) {
              <article class="room-card animate-in" [style.animation-delay]="(i * 0.08) + 's'">

                <!-- Photo -->
                <div class="room-photo-wrap">
                  @if (res.photos?.length) {
                    <img [src]="res.photos[0]" [alt]="res.name" class="room-photo"
                      (error)="onImgError($event)" loading="lazy" />
                  } @else {
                    <div class="room-photo-fallback">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
                    </div>
                  }
                  <div class="room-photo-gradient"></div>

                  <!-- Badges on photo -->
                  <div class="photo-top-row">
                    <div class="room-status-pill" [class]="'status-' + (res.status || 'available')">
                      <span class="status-indicator"></span>
                      {{ getStatusLabel(res.status) }}
                    </div>
                    @if (res.pricePerHour > 0) {
                      <div class="room-price-pill">
                        {{ res.pricePerHour | number }} Ar/h
                      </div>
                    }
                  </div>

                  <!-- Name over photo -->
                  <div class="photo-bottom-row">
                    <h3 class="room-name-overlay">{{ res.name }}</h3>
                    <span class="room-capacity-pill">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                      {{ res.capacity }}
                    </span>
                  </div>
                </div>

                <!-- Card body -->
                <div class="room-body">

                  <!-- Location + desc -->
                  @if (res.location) {
                    <div class="room-loc">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {{ res.location }}
                    </div>
                  }

                  @if (res.description) {
                    <p class="room-desc">{{ res.description }}</p>
                  }

                  <!-- Amenities -->
                  @if (res.amenities?.length) {
                    <div class="room-amenities">
                      @for (a of res.amenities.slice(0, 4); track a) {
                        <span class="amenity-tag">{{ getAmenityIcon(a) }} {{ a }}</span>
                      }
                      @if (res.amenities.length > 4) {
                        <span class="amenity-tag amenity-more">+{{ res.amenities.length - 4 }}</span>
                      }
                    </div>
                  }

                  <!-- ── TIMELINE ─────────────────────────────── -->
                  <div class="room-tl-section">
                    <div class="room-tl-header">
                      <span class="tl-section-label">Créneaux du jour</span>
                      @if (getNextFreeSlot(res._id); as next) {
                        <span class="next-free-badge">
                          <span class="nfb-dot"></span>
                          Libre à {{ next }}
                        </span>
                      }
                    </div>

                    <!-- Visual bar timeline -->
                    <div class="tl-bar-wrap">
                      <div class="tl-bar">
                        @for (slot of getTodayTimeline(res._id); track slot.hour) {
                          <div class="tl-seg"
                            [class.tl-seg-busy]="slot.busy"
                            [class.tl-seg-partial]="slot.partial"
                            [title]="(slot.busy ? 'Occupé — ' : slot.partial ? 'Partiel — ' : 'Libre — ') + slot.label">
                          </div>
                        }
                      </div>
                      <div class="tl-bar-labels">
                        <span>8h</span><span>11h</span><span>14h</span><span>17h</span><span>20h</span>
                      </div>
                    </div>

                    <!-- Booking items list -->
                    @if (res.todayBookings.length) {
                      <div class="tl-bookings-list">
                        @for (b of res.todayBookings.slice(0, 3); track b._id) {
                          <div class="tl-booking-row">
                            <div class="tl-bk-time-block">
                              <span class="tl-bk-start">{{ b.startTime | date:'HH:mm' }}</span>
                              <span class="tl-bk-arrow">→</span>
                              <span class="tl-bk-end">{{ b.endTime | date:'HH:mm' }}</span>
                            </div>
                            <div class="tl-bk-info">
                              <span class="tl-bk-duration">{{ getDurationMinutes(b.startTime, b.endTime) }} min</span>
                              <span class="tl-bk-dot" [class.confirmed]="b.status === 'confirmed'"></span>
                            </div>
                          </div>
                        }
                        @if (res.todayBookings.length > 3) {
                          <div class="tl-more">+ {{ res.todayBookings.length - 3 }} autre(s)</div>
                        }
                      </div>
                    } @else {
                      <div class="tl-all-free">
                        <span class="tl-free-dot"></span>
                        Toute la journée disponible
                      </div>
                    }
                  </div>

                  <!-- CTA -->
                  @if (res.status === 'maintenance') {
                    <button class="btn btn-outline btn-block room-cta" disabled>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                      En maintenance
                    </button>
                  } @else {
                    <button class="btn btn-brand btn-block room-cta"
                      (click)="openBookingModal(res)">
                      Réserver ce créneau
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  }

                </div>
              </article>
            }
          </div>
        }
      </section>

      <!-- ── MES RÉSERVATIONS ──────────────────────────── -->
      <section class="my-bookings-section animate-in animate-in-delay-3">

        <div class="section-head">
          <div class="section-head-left">
            <h2 class="section-h">Mes Réservations</h2>
            <p class="section-sub">Historique et statut de vos réservations</p>
          </div>
          <button (click)="loadBookings()" class="btn btn-outline btn-sm refresh-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            Actualiser
          </button>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Chargement…</p>
          </div>
        }

        @else if (myBookings().length === 0) {
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
            </div>
            <div class="empty-state-title">Aucune réservation</div>
            <p class="empty-state-desc">Réservez une salle ci-dessus pour commencer !</p>
          </div>
        }

        @else {
          <div class="bookings-grid">
            @for (bk of myBookings(); track bk._id) {
              <div class="bk-card"
                [class.just-updated]="recentlyUpdated().has(bk._id)"
                [attr.data-status]="bk.status">

                <!-- Left accent bar -->
                <div class="bk-accent"></div>

                <div class="bk-body">
                  <!-- Header row -->
                  <div class="bk-header">
                    <span class="badge" [class]="getBookingBadgeClass(bk.status)">
                      {{ getBookingStatusLabel(bk.status) }}
                    </span>
                    <span class="bk-date">{{ bk.createdAt | date:'d MMM, HH:mm' }}</span>
                  </div>

                  <!-- Resource name -->
                  <h3 class="bk-resource">{{ bk.resourceName }}</h3>

                  <!-- Time info -->
                  <div class="bk-times">
                    <div class="bk-time-row">
                      <span class="bk-time-lbl">Début</span>
                      <span class="bk-time-val">{{ bk.startTime | date:'d MMM · HH:mm' }}</span>
                    </div>
                    <div class="bk-time-row">
                      <span class="bk-time-lbl">Fin</span>
                      <span class="bk-time-val">{{ bk.endTime | date:'HH:mm' }}</span>
                    </div>
                    <div class="bk-time-row">
                      <span class="bk-time-lbl">Durée</span>
                      <span class="bk-time-val bk-duration">{{ getDurationMinutes(bk.startTime, bk.endTime) }} min</span>
                    </div>
                  </div>

                  <!-- Payment row -->
                  @if ($any(bk).paymentAmount > 0) {
                    <div class="bk-payment">
                      <span class="badge" [class]="getPaymentBadgeClass($any(bk).paymentStatus)">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        {{ getPaymentLabel($any(bk).paymentStatus) }}
                      </span>
                      <span class="bk-amount">{{ $any(bk).paymentAmount | number }} Ar</span>
                    </div>
                  }

                  @if (bk.notes) {
                    <p class="bk-notes">{{ bk.notes }}</p>
                  }

                  <!-- Footer -->
                  <div class="bk-footer">
                    @if (bk.status !== 'cancelled') {
                      <button (click)="onCancel(bk._id)" class="btn btn-sm btn-danger">
                        Annuler
                      </button>
                    } @else {
                      <span></span>
                    }
                    @if ($any(bk).invoiceNumber) {
                      <span class="bk-invoice">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        {{ $any(bk).invoiceNumber }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </section>

    </div><!-- /page-wrap -->
  `,
  styles: [`
    /* ═══════════════════════════════════════════════════
       PAGE LAYOUT
    ═══════════════════════════════════════════════════ */
    .page-wrap {
      max-width: 1320px;
      margin: 0 auto;
      padding: 0 28px 100px;
    }

    /* ═══════════════════════════════════════════════════
       HERO
    ═══════════════════════════════════════════════════ */
    .hero {
      position: relative;
      overflow: hidden;
      margin: 0 -28px 60px;
      padding: 56px 56px 64px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .hero-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
    }

    .hero-orb-1 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%);
      top: -150px; right: -100px;
      animation: heroOrbFloat 12s ease-in-out infinite;
    }

    .hero-orb-2 {
      width: 320px; height: 320px;
      background: radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%);
      bottom: -100px; left: 20%;
      animation: heroOrbFloat 16s ease-in-out infinite reverse;
    }

    .hero-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 52px 52px;
    }

    .hero-body { position: relative; z-index: 1; max-width: 700px; }

    .hero-greeting {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full);
      padding: 6px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 18px;
    }

    .greeting-wave {
      font-size: 1rem;
      animation: wave 2.5s ease-in-out infinite;
      display: inline-block;
    }

    @keyframes wave {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(18deg); }
      40% { transform: rotate(-8deg); }
      60% { transform: rotate(10deg); }
    }

    .hero-title {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4.5vw, 3rem);
      font-weight: 700;
      letter-spacing: -0.04em;
      line-height: 1.1;
      margin-bottom: 14px;
      color: var(--text-primary);
    }

    .hero-sub {
      font-size: 1rem;
      color: var(--text-muted);
      margin-bottom: 36px;
      line-height: 1.65;
      max-width: 520px;
    }

    .hero-kpis {
      display: flex;
      align-items: center;
      gap: 28px;
      flex-wrap: wrap;
    }

    .kpi { display: flex; flex-direction: column; gap: 3px; }

    .kpi-val {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.04em;
      color: var(--text-primary);
      line-height: 1;
    }

    .kpi-lbl {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .kpi-sep {
      width: 1px;
      height: 36px;
      background: var(--border-medium);
      flex-shrink: 0;
    }

    @keyframes heroOrbFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50%       { transform: translate(-20px, 20px) scale(1.06); }
    }

    /* ═══════════════════════════════════════════════════
       SECTION HEADERS
    ═══════════════════════════════════════════════════ */
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .section-h {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .section-sub {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .rooms-section { margin-bottom: 64px; }
    .my-bookings-section { margin-bottom: 48px; }

    /* WS pill */
    .ws-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 13px;
      border-radius: var(--radius-full);
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .ws-dot-el {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--border-medium);
    }

    .ws-pill.live { color: var(--success); border-color: var(--success-border); background: var(--success-bg); }
    .ws-pill.live .ws-dot-el {
      background: var(--success);
      animation: pulseDot 2s ease-in-out infinite;
    }

    /* Refresh button */
    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    /* ═══════════════════════════════════════════════════
       ROOMS GRID
    ═══════════════════════════════════════════════════ */
    .rooms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }

    /* ═══════════════════════════════════════════════════
       ROOM CARD
    ═══════════════════════════════════════════════════ */
    .room-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl);
      overflow: hidden;
      transition: transform 0.3s var(--ease-spring), box-shadow 0.3s var(--ease-spring), border-color 0.3s;
    }

    .room-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px var(--border-medium);
      border-color: var(--border-medium);
    }

    /* Photo */
    .room-photo-wrap {
      position: relative;
      height: 200px;
      overflow: hidden;
      background: var(--bg-elevated);
    }

    .room-photo {
      width: 100%; height: 100%;
      object-fit: cover;
      transition: transform 0.5s var(--ease-smooth);
    }

    .room-card:hover .room-photo { transform: scale(1.06); }

    .room-photo-fallback {
      width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-elevated);
    }

    .room-photo-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(8,11,20,0.1) 0%,
        transparent 35%,
        rgba(8,11,20,0.7) 75%,
        rgba(8,11,20,0.92) 100%
      );
    }

    .photo-top-row {
      position: absolute;
      top: 12px; left: 12px; right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .photo-bottom-row {
      position: absolute;
      bottom: 14px; left: 16px; right: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    /* Status pill */
    .room-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.7rem;
      font-weight: 700;
      backdrop-filter: blur(12px);
      letter-spacing: 0.02em;
    }

    .status-indicator {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-available {
      background: rgba(16,185,129,0.18);
      border: 1px solid rgba(16,185,129,0.35);
      color: var(--success);
    }
    .status-available .status-indicator { animation: pulseDot 2s ease-in-out infinite; }

    .status-reserved, .status-busy {
      background: rgba(245,158,11,0.18);
      border: 1px solid rgba(245,158,11,0.35);
      color: var(--warning);
    }

    .status-maintenance {
      background: rgba(248,113,113,0.15);
      border: 1px solid rgba(248,113,113,0.3);
      color: var(--danger);
    }

    .room-price-pill {
      background: rgba(8,11,20,0.7);
      backdrop-filter: blur(12px);
      color: var(--text-primary);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .room-name-overlay {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 700;
      color: white;
      letter-spacing: -0.02em;
      text-shadow: 0 1px 8px rgba(0,0,0,0.4);
    }

    .room-capacity-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(8px);
      color: rgba(255,255,255,0.85);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: var(--radius-full);
      border: 1px solid rgba(255,255,255,0.15);
    }

    /* Card body */
    .room-body { padding: 20px 22px 22px; }

    .room-loc {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .room-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.55;
      margin-bottom: 14px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .room-amenities {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 18px;
    }

    .amenity-tag {
      font-size: 0.72rem;
      font-weight: 500;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      padding: 4px 9px;
      border-radius: var(--radius-full);
    }

    .amenity-more {
      background: var(--brand-subtle);
      border-color: var(--border-brand);
      color: var(--brand);
    }

    /* ── TIMELINE ── */
    .room-tl-section { margin-bottom: 18px; }

    .room-tl-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .tl-section-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .next-free-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--success);
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .nfb-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: var(--success);
      animation: pulseDot 2s ease-in-out infinite;
    }

    .tl-bar-wrap { margin-bottom: 10px; }

    .tl-bar {
      display: flex;
      gap: 2px;
      height: 8px;
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: 4px;
    }

    .tl-seg {
      flex: 1;
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      border-radius: 2px;
      transition: opacity 0.15s;
    }

    .tl-seg:hover { opacity: 0.75; }
    .tl-seg-busy    { background: rgba(245,158,11,0.2); border-color: rgba(245,158,11,0.4); }
    .tl-seg-partial { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.25); border-style: dashed; }

    .tl-bar-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.62rem;
      color: var(--text-faint);
    }

    .tl-bookings-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .tl-booking-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 10px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }

    .tl-bk-time-block {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
    }

    .tl-bk-start { font-weight: 700; color: var(--text-primary); }
    .tl-bk-arrow { color: var(--text-faint); font-size: 0.7rem; }
    .tl-bk-end   { font-weight: 600; color: var(--text-secondary); }

    .tl-bk-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tl-bk-duration {
      font-size: 0.72rem;
      color: var(--text-muted);
      background: var(--bg-overlay);
      padding: 2px 7px;
      border-radius: var(--radius-full);
      font-weight: 500;
    }

    .tl-bk-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--warning);
      flex-shrink: 0;
    }

    .tl-bk-dot.confirmed { background: var(--success); }

    .tl-more {
      font-size: 0.72rem;
      color: var(--text-muted);
      padding-left: 4px;
    }

    .tl-all-free {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--success);
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
    }

    .tl-free-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--success);
      animation: pulseDot 2s ease-in-out infinite;
      flex-shrink: 0;
    }

    /* CTA button */
    .room-cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    /* ═══════════════════════════════════════════════════
       MY BOOKINGS GRID
    ═══════════════════════════════════════════════════ */
    .bookings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 18px;
    }

    .bk-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      transition: transform 0.25s var(--ease-spring), box-shadow 0.25s var(--ease-spring), border-color 0.25s;
    }

    .bk-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-md);
      border-color: var(--border-medium);
    }

    .bk-card.just-updated { animation: flashUpdate 1.5s ease-out; }

    /* Accent bar */
    .bk-accent {
      width: 4px;
      flex-shrink: 0;
      background: var(--border-medium);
    }

    .bk-card[data-status="confirmed"] .bk-accent { background: var(--success); }
    .bk-card[data-status="pending"]   .bk-accent { background: var(--warning); }
    .bk-card[data-status="cancelled"] .bk-accent { background: var(--danger); opacity: 0.5; }

    .bk-card[data-status="cancelled"] { opacity: 0.65; }

    .bk-body { padding: 16px 18px; flex: 1; min-width: 0; }

    .bk-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      gap: 8px;
    }

    .bk-date {
      font-size: 0.72rem;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .bk-resource {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 12px;
      letter-spacing: -0.02em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bk-times {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 12px;
      padding: 10px 12px;
      background: var(--bg-elevated);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    .bk-time-row {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 0.82rem;
    }

    .bk-time-lbl {
      color: var(--text-muted);
      width: 42px;
      flex-shrink: 0;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .bk-time-val { font-weight: 600; color: var(--text-primary); }
    .bk-duration { color: var(--brand); }

    .bk-payment {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding: 8px 10px;
      background: var(--bg-elevated);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    .bk-amount {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--brand);
    }

    .bk-notes {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-style: italic;
      margin-bottom: 10px;
      padding: 6px 0;
      border-top: 1px solid var(--border-subtle);
    }

    .bk-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
      margin-top: 4px;
    }

    .bk-invoice {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      color: var(--brand);
      font-weight: 600;
    }

    /* ═══════════════════════════════════════════════════
       MODAL OVERRIDES
    ═══════════════════════════════════════════════════ */
    .modal-glow-line {
      position: absolute;
      top: 0; left: 15%; right: 15%;
      height: 1px;
      background: var(--gradient-brand);
      opacity: 0.5;
    }

    .modal-subtitle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      color: var(--brand);
      font-weight: 600;
      margin-top: 3px;
    }

    .modal-subtitle-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: var(--brand);
      animation: pulseDot 2s ease-in-out infinite;
    }

    /* Resource preview inside modal */
    .modal-resource-card {
      display: flex;
      gap: 14px;
      align-items: center;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 14px;
      margin-bottom: 20px;
    }

    .modal-resource-thumb {
      width: 72px; height: 54px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      flex-shrink: 0;
      background: var(--bg-overlay);
    }

    .modal-resource-thumb img {
      width: 100%; height: 100%;
      object-fit: cover;
    }

    .modal-thumb-placeholder {
      width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-faint);
    }

    .modal-resource-name {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .modal-resource-loc {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .modal-resource-chips { display: flex; gap: 6px; flex-wrap: wrap; }

    .modal-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      padding: 3px 9px;
      border-radius: var(--radius-full);
    }

    .modal-chip-price {
      background: var(--brand-subtle);
      border-color: var(--border-brand);
      color: var(--brand);
    }

    /* Modal timeline */
    .modal-timeline-block { margin-bottom: 22px; }

    .block-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    .modal-tl-track {
      display: flex;
      gap: 2px;
      height: 10px;
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: 4px;
    }

    .modal-tl-cell {
      flex: 1;
      background: var(--success-bg);
      border-left: 1px solid transparent;
    }

    .modal-tl-cell.busy    { background: rgba(245,158,11,0.25); }
    .modal-tl-cell.partial { background: rgba(245,158,11,0.12); }

    .modal-tl-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.62rem;
      color: var(--text-faint);
      margin-bottom: 8px;
    }

    .modal-tl-legend {
      display: flex;
      gap: 16px;
    }

    .tl-leg-free, .tl-leg-partial, .tl-leg-busy {
      font-size: 0.7rem;
      font-weight: 600;
    }
    .tl-leg-free    { color: var(--success); }
    .tl-leg-partial { color: var(--warning); }
    .tl-leg-busy    { color: var(--warning); }

    /* Modal form */
    .modal-form { display: flex; flex-direction: column; gap: 16px; }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    /* Cost summary */
    .cost-card {
      background: var(--bg-elevated);
      border: 1px solid var(--border-brand);
      border-radius: var(--radius-md);
      padding: 16px;
    }

    .cost-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 0.875rem;
    }

    .cost-lbl { color: var(--text-muted); font-size: 0.82rem; }
    .cost-val { font-weight: 600; color: var(--text-secondary); }

    .cost-divider {
      height: 1px;
      background: var(--border-medium);
      margin: 8px 0;
    }

    .cost-row-total {
      font-weight: 700;
      color: var(--text-primary);
      padding-top: 4px;
    }

    .cost-total-val {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--brand);
    }

    .cost-row-deposit {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 4px;
    }

    /* ═══════════════════════════════════════════════════
       MISC KEYFRAMES
    ═══════════════════════════════════════════════════ */
    @keyframes pulseDot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%       { transform: scale(1.5); opacity: 0.7; }
    }

    @keyframes flashUpdate {
      0%   { box-shadow: 0 0 0 3px rgba(129,140,248,0.5); }
      100% { box-shadow: none; }
    }

    /* ═══════════════════════════════════════════════════
       RESPONSIVE
    ═══════════════════════════════════════════════════ */
    @media (max-width: 1024px) {
      .page-wrap { padding: 0 20px 80px; }
    }

    @media (max-width: 768px) {
      .page-wrap  { padding: 0 16px 80px; }
      .hero       { margin: 0 -16px 48px; padding: 40px 20px 48px; }
      .hero-kpis  { gap: 16px; }
      .kpi-sep    { height: 28px; }
      .rooms-grid { grid-template-columns: 1fr; }
      .bookings-grid { grid-template-columns: 1fr; }
      .form-row-2 { grid-template-columns: 1fr; }
      .modal-content { padding: 24px 20px; }
    }

    @media (max-width: 480px) {
      .hero-kpis { flex-direction: column; align-items: flex-start; gap: 12px; }
      .kpi-sep   { display: none; }
    }
  `]
})
export class BookingClientComponent implements OnInit, OnDestroy {
  private readonly bookingService = inject(BookingService);
  private readonly socketService  = inject(SocketService);
  private readonly authService    = inject(AuthService);
  private readonly http           = inject(HttpClient);

  myBookings         = signal<Booking[]>([]);
  resources          = signal<Resource[]>([]);
  allTodayBookings   = signal<Record<string, DayBooking[]>>({});
  isLoading          = signal(true);
  isLoadingResources = signal(true);
  isSubmitting       = signal(false);
  bookingError       = signal<string | null>(null);
  recentlyUpdated    = signal<Set<string>>(new Set());
  showModal          = signal(false);
  selectedResource   = signal<Resource | null>(null);
  toasts             = signal<{ id: number; message: string; type: string; leaving: boolean }[]>([]);
  wsConnected        = signal(false);
  toastCounter       = 0;

  newBooking: CreateBookingDto = {
    resourceId: '', resourceName: '', startTime: '', endTime: '', notes: ''
  };

  estimatedAmount   = signal(0);
  estimatedDuration = signal(0);

  currentUser = computed(() => this.authService.currentUser());
  myActiveBookings = computed(() =>
    this.myBookings().filter(b => b.status !== 'cancelled').length
  );
  nextBooking = computed(() => {
    const now = new Date();
    return this.myBookings()
      .filter(b => b.status !== 'cancelled' && new Date(b.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null;
  });
  resourcesWithBookings = computed<ResourceWithBookings[]>(() =>
    this.resources().filter(r => r.available || r.status === 'available').map(r => ({
      ...r,
      todayBookings: this.allTodayBookings()[r._id] ?? [],
    }))
  );

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
        this.loadTodayBookings(update.resource._id);
      } else if (update.event === 'resource:updated') {
        this.resources.update(list =>
          list.map(r => r._id === update.resource._id ? update.resource : r)
            .filter(r => r.available)
        );
      } else if (update.event === 'resource:deleted') {
        this.resources.update(list => list.filter(r => r._id !== update.resource._id));
      }
    });
  }

  ngOnInit() {
    this.loadResources();
    this.loadBookings();
    this.socketService.connect();
    this.wsConnected.set(true);
  }

  ngOnDestroy() { this.socketService.disconnect(); }

  loadResources() {
    this.isLoadingResources.set(true);
    this.http.get<Resource[]>(`${environment.apiUrl}/api/resources/available`).subscribe({
      next: (data) => {
        this.resources.set(data);
        this.isLoadingResources.set(false);
        data.forEach(r => this.loadTodayBookings(r._id));
      },
      error: () => this.isLoadingResources.set(false)
    });
  }

  loadTodayBookings(resourceId: string) {
    const today = new Date().toISOString().split('T')[0];
    this.http.get<DayBooking[]>(`${environment.apiUrl}/api/bookings/resource/${resourceId}`).subscribe({
      next: (bookings) => {
        const todayB = bookings.filter(b => {
          const bDate = new Date(b.startTime).toISOString().split('T')[0];
          return bDate === today;
        });
        this.allTodayBookings.update(map => ({ ...map, [resourceId]: todayB }));
      },
      error: () => {}
    });
  }

  loadBookings() {
    this.isLoading.set(true);
    this.bookingService.getMyBookings().subscribe({
      next: (data) => { this.myBookings.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  openBookingModal(res: Resource) {
    this.selectedResource.set(res);
    this.newBooking = { resourceId: res._id, resourceName: res.name, startTime: '', endTime: '', notes: '' };
    this.bookingError.set(null);
    this.estimatedAmount.set(0);
    this.estimatedDuration.set(0);
    this.showModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.showModal.set(false);
    document.body.style.overflow = '';
  }

  recalculateAmount() {
    const { startTime, endTime } = this.newBooking;
    const res = this.selectedResource();
    if (!startTime || !endTime || !res) return;
    const start = new Date(startTime);
    const end   = new Date(endTime);
    if (end <= start) return;
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    this.estimatedDuration.set(Math.round(hours * 10) / 10);
    this.estimatedAmount.set(Math.round(hours * (res.pricePerHour || 0)));
  }

  onBookingSubmit() {
    this.isSubmitting.set(true);
    this.bookingError.set(null);

    const payload: CreateBookingDto = {
      ...this.newBooking,
      startTime: new Date(this.newBooking.startTime).toISOString(),
      endTime:   new Date(this.newBooking.endTime).toISOString(),
    };

    this.bookingService.createBooking(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.loadBookings();
        this.loadTodayBookings(this.newBooking.resourceId);
        this.showToast('Réservation confirmée avec succès !', 'success');
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Réservation échouée.';
        this.bookingError.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.isSubmitting.set(false);
      }
    });
  }

  onCancel(id: string) {
    if (confirm('Annuler cette réservation ?')) {
      this.bookingService.cancelBooking(id).subscribe({
        next: () => {
          this.loadBookings();
          this.showToast('Réservation annulée.', 'info');
        }
      });
    }
  }

  /* ── TIMELINE ─────────────────────────────────────────── */
  getTodayTimeline(resourceId: string): { hour: number; busy: boolean; partial: boolean; label: string }[] {
    const bookings = this.allTodayBookings()[resourceId] ?? [];
    return Array.from({ length: 12 }, (_, i) => {
      const hour = 8 + i;
      const from = new Date(); from.setHours(hour, 0, 0, 0);
      const to   = new Date(); to.setHours(hour + 1, 0, 0, 0);
      const overlaps = bookings.filter(b =>
        new Date(b.startTime) < to && new Date(b.endTime) > from
      );
      const partial = overlaps.length > 0 &&
        (new Date(overlaps[0].startTime) > from || new Date(overlaps[0].endTime) < to);
      return { hour, busy: overlaps.length > 0 && !partial, partial, label: `${hour}h–${hour + 1}h` };
    });
  }

  getNextFreeSlot(resourceId: string): string | null {
    const now = new Date();
    const bookings = (this.allTodayBookings()[resourceId] ?? [])
      .filter(b => new Date(b.endTime) > now)
      .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
    if (!bookings.length) return null;
    const lastEnd = new Date(bookings[bookings.length - 1].endTime);
    if (lastEnd.getHours() >= 20) return null;
    return `${lastEnd.getHours()}h${String(lastEnd.getMinutes()).padStart(2, '0')}`;
  }

  /* ── UTILS ────────────────────────────────────────────── */
  getDurationMinutes(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  }

  getStatusLabel(s: string): string {
    return ({ available: 'Disponible', reserved: 'Occupée', maintenance: 'Maintenance' } as any)[s] ?? s;
  }

  getBookingStatusLabel(s: string): string {
    return ({ pending: 'En attente', confirmed: 'Confirmée', cancelled: 'Annulée' } as any)[s] ?? s;
  }

  getBookingBadgeClass(s: string): string {
    return ({ pending: 'badge badge-warning', confirmed: 'badge badge-success', cancelled: 'badge badge-danger' } as any)[s] ?? 'badge badge-neutral';
  }

  getPaymentLabel(s: string): string {
    return ({ unpaid: 'Non payé', pending: 'En attente', paid: 'Payé', refunded: 'Remboursé' } as any)[s] ?? s;
  }

  getPaymentBadgeClass(s: string): string {
    return ({ unpaid: 'badge badge-danger', pending: 'badge badge-warning', paid: 'badge badge-success', refunded: 'badge badge-info' } as any)[s] ?? 'badge badge-neutral';
  }

  getAmenityIcon(a: string): string {
    const icons: Record<string, string> = {
      'WiFi': '📶', 'Projecteur': '📽️', 'Tableau blanc': '📋',
      'Climatisation': '❄️', 'Visioconférence': '📹',
      'Imprimante': '🖨️', 'Cuisine': '🍽️', 'Parking': '🅿️',
    };
    return icons[a] ?? '✓';
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = ++this.toastCounter;
    this.toasts.update(t => [...t, { id, message, type, leaving: false }]);
    setTimeout(() => {
      this.toasts.update(t => t.map(x => x.id === id ? { ...x, leaving: true } : x));
      setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 400);
    }, 3500);
  }

  private markUpdated(id: string) {
    this.recentlyUpdated.update(s => { const n = new Set(s); n.add(id); return n; });
    setTimeout(() => {
      this.recentlyUpdated.update(s => { const n = new Set(s); n.delete(id); return n; });
    }, 2000);
  }
}