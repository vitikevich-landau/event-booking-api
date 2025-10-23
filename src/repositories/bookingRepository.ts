import pool from '../config/database';
import { Booking, Event } from '../types';
import { NotFoundError, ConflictError } from '../utils/errors';

export class BookingRepository {
  async createBooking(eventId: number, userId: string): Promise<Booking> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Проверяем существование события и блокируем строку (FOR UPDATE)
      const eventResult = await client.query<Event>(
        'SELECT id, name, total_seats FROM events WHERE id = $1 FOR UPDATE',
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        throw new NotFoundError(`Event with id ${eventId} not found`);
      }

      const event = eventResult.rows[0];

      // 2. Считаем текущее количество бронирований для этого события
      const countResult = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1',
        [eventId]
      );

      const currentBookings = parseInt(countResult.rows[0].count, 10);

      // 3. Проверяем доступность мест
      if (currentBookings >= event.total_seats) {
        throw new ConflictError('No seats available for this event');
      }

      // 4. Пытаемся создать бронирование
      // Уникальный индекс (event_id, user_id) защитит от дублирующих бронирований
      const insertResult = await client.query<Booking>(
        `INSERT INTO bookings (event_id, user_id) 
         VALUES ($1, $2) 
         RETURNING id, event_id, user_id, created_at`,
        [eventId, userId]
      );

      await client.query('COMMIT');

      return insertResult.rows[0];
    } catch (error: unknown) {
      await client.query('ROLLBACK');

      // PostgreSQL unique constraint violation
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        throw new ConflictError('User has already booked this event');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async getBookingsByEventId(eventId: number): Promise<Booking[]> {
    const result = await pool.query<Booking>(
      'SELECT id, event_id, user_id, created_at FROM bookings WHERE event_id = $1 ORDER BY created_at DESC',
      [eventId]
    );

    return result.rows;
  }

  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    const result = await pool.query<Booking>(
      'SELECT id, event_id, user_id, created_at FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows;
  }

  async checkBookingExists(eventId: number, userId: string): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM bookings WHERE event_id = $1 AND user_id = $2)',
      [eventId, userId]
    );

    return result.rows[0].exists;
  }
}

export default new BookingRepository();
