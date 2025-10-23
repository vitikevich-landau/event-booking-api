export interface Event {
  id: number;
  name: string;
  total_seats: number;
  created_at: Date;
}

export interface Booking {
  id: number;
  event_id: number;
  user_id: string;
  created_at: Date;
}

export interface CreateBookingRequest {
  event_id: number;
  user_id: string;
}

export interface BookingResponse {
  id: number;
  event_id: number;
  user_id: string;
  created_at: Date;
  message: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}
