
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export interface Booking {
  _id: string;
  userId: string;
  userName: string;
  resourceId: string;
  resourceName: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  status: BookingStatus;
  version: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingDto {
  resourceId: string;
  resourceName: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface UpdateBookingDto {
  status?: BookingStatus;
  notes?: string;
  version: number;
}
