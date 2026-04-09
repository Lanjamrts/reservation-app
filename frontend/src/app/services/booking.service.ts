import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking, CreateBookingDto, UpdateBookingDto } from '../models/booking.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  // ✅ URL correcte — /api/bookings
  private readonly API_URL = `${environment.apiUrl}/api/bookings`;

  constructor(private http: HttpClient) {}

  getAllBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.API_URL);
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.API_URL}/my`);
  }

  getAvailableSlots(resourceId: string, date: string): Observable<any[]> {
    const params = new HttpParams()
      .set('resourceId', resourceId)
      .set('date', date);
    return this.http.get<any[]>(`${this.API_URL}/slots`, { params });
  }

  createBooking(bookingData: CreateBookingDto): Observable<Booking> {
    return this.http.post<Booking>(this.API_URL, bookingData);
  }

  getBookingById(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.API_URL}/${id}`);
  }

  updateStatus(id: string, updateData: UpdateBookingDto): Observable<Booking> {
    return this.http.patch<Booking>(`${this.API_URL}/${id}/status`, updateData);
  }

  cancelBooking(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}