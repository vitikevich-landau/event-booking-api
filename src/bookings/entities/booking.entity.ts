/**
 * Booking Entity
 *
 * Представляет бронирование места на событие.
 * Это TypeScript interface, используемый для типизации данных из БД.
 */
export interface Booking {
  id: number;
  event_id: number;
  user_id: string;
  created_at: Date;
}
