import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { Event } from './entities/event.entity';

/**
 * EventsRepository
 *
 * Отвечает за работу с таблицей events в базе данных.
 * Это единственное место в приложении, где выполняются SQL запросы к events.
 */
@Injectable()
export class EventsRepository {
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  /**
   * getAllEvents - Получает список всех событий
   *
   * @returns {Promise<Event[]>} Массив всех событий, отсортированных по дате создания
   */
  async getAllEvents(): Promise<Event[]> {
    const result = await this.pool.query<Event>(
      'SELECT id, name, total_seats, created_at FROM events ORDER BY created_at DESC',
    );

    return result.rows;
  }

  /**
   * getEventById - Получает одно событие по ID
   *
   * @param {number} id - Уникальный идентификатор события
   * @returns {Promise<Event>} Объект события
   * @throws {NotFoundException} Если событие с таким ID не существует
   */
  async getEventById(id: number): Promise<Event> {
    const result = await this.pool.query<Event>(
      'SELECT id, name, total_seats, created_at FROM events WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    return result.rows[0];
  }

  /**
   * getAvailableSeats - Вычисляет количество свободных мест на событии
   *
   * Алгоритм:
   * 1. Получаем total_seats из events
   * 2. Считаем количество бронирований из bookings
   * 3. Вычисляем разницу: total_seats - COUNT(bookings)
   *
   * SQL трюк:
   * - LEFT JOIN гарантирует что событие будет в результате даже если нет бронирований
   * - COUNT(b.id) считает только существующие бронирования (NULL не считаются)
   * - GROUP BY нужен для агрегации с COUNT
   *
   * @param {number} eventId - ID события
   * @returns {Promise<number>} Количество свободных мест
   * @throws {NotFoundException} Если событие не существует
   */
  async getAvailableSeats(eventId: number): Promise<number> {
    const result = await this.pool.query<{ available_seats: number }>(
      `SELECT (e.total_seats - COUNT(b.id)) as available_seats
       FROM events e
       LEFT JOIN bookings b ON e.id = b.event_id
       WHERE e.id = $1
       GROUP BY e.id, e.total_seats`,
      [eventId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    return result.rows[0].available_seats;
  }
}
