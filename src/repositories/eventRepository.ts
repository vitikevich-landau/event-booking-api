import pool from '../config/database';
import { Event } from '../types';
import { NotFoundError } from '../utils/errors';

export class EventRepository {
  async getAllEvents(): Promise<Event[]> {
    const result = await pool.query<Event>(
      'SELECT id, name, total_seats, created_at FROM events ORDER BY created_at DESC'
    );

    return result.rows;
  }

  async getEventById(id: number): Promise<Event> {
    const result = await pool.query<Event>(
      'SELECT id, name, total_seats, created_at FROM events WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    return result.rows[0];
  }

  async getAvailableSeats(eventId: number): Promise<number> {
    const result = await pool.query<{ available_seats: number }>(
      `SELECT (e.total_seats - COUNT(b.id)) as available_seats
       FROM events e
       LEFT JOIN bookings b ON e.id = b.event_id
       WHERE e.id = $1
       GROUP BY e.id, e.total_seats`,
      [eventId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    return result.rows[0].available_seats;
  }
}

export default new EventRepository();
