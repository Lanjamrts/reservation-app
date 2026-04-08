
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking, CreateBookingDto, UpdateBookingDto } from '../models/booking.model';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly API_URL = 'http://localhost:3000/api/bookings';

  constructor(private http: HttpClient) {}

  /**
   * Get all bookings (Admin only)
   */
  getAllBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.API_URL);
  }

  /**
   * Get bookings for the currently authenticated user
   */
  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.API_URL}/my`);
  }

  /**
   * Get available slots for a given resource and date
   */
  getAvailableSlots(resourceId: string, date: string): Observable<any[]> {
    const params = new HttpParams()
      .set('resourceId', resourceId)
      .set('date', date);
    return this.http.get<any[]>(`${this.API_URL}/slots`, { params });
  }

  /**
   * Create a new booking
   */
  createBooking(bookingData: CreateBookingDto): Observable<Booking> {
    return this.http.post<Booking>(this.API_URL, bookingData);
  }

  /**
   * Get a single booking by ID
   */
  getBookingById(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.API_URL}/${id}`);
  }

  /**
   * Update booking status (Admin only)
   */
  updateStatus(id: string, updateData: UpdateBookingDto): Observable<Booking> {
    return this.http.patch<Booking>(`${this.API_URL}/${id}/status`, updateData);
  }

  /**
   * Cancel a booking
   */
  cancelBooking(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
