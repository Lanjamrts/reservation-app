import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { Booking } from '../models/booking.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  // ✅ URL du socket — racine sans /api
  private readonly SOCKET_URL = environment.apiUrl;

  latestBookingUpdate = signal<{ event: string; booking: Booking } | null>(null);
  adminUpdate = signal<any>(null);
  resourceUpdate = signal<{ event: string; resource: any } | null>(null);

  constructor(private authService: AuthService) {}

  connect(): void {
    if (!this.authService.isLoggedIn()) return;
    if (this.socket?.connected) return;

    const token = this.authService.getToken();
    this.socket = io(this.SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => console.log('✅ WebSocket connecté'));
    this.socket.on('connect_error', () => console.warn('⚠️ WebSocket indisponible'));

    ['booking:created', 'booking:updated', 'booking:cancelled'].forEach((event) => {
      this.socket?.on(event, (booking: Booking) => {
        this.latestBookingUpdate.set({ event, booking });
      });
    });

    this.socket.on('admin:booking:update', (payload) => {
      this.adminUpdate.set(payload);
    });

    this.socket.on('resource:update', (payload) => {
      this.resourceUpdate.set(payload);
    });

    this.socket.on('disconnect', () => console.log('WebSocket déconnecté'));
  }

  subscribeToResource(resourceId: string): void {
    if (!this.socket?.connected) this.connect();
    this.socket?.emit('subscribe:resource', { resourceId });
  }

  unsubscribeFromResource(resourceId: string): void {
    this.socket?.emit('unsubscribe:resource', { resourceId });
  }

  disconnect(): void {
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
  }
}