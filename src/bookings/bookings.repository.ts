import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { Booking } from './entities/booking.entity';

/**
 * BookingsRepository
 *
 * Отвечает за работу с таблицей bookings в базе данных.
 * Включает защиту от race conditions и дублирования бронирований.
 */
@Injectable()
export class BookingsRepository {
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  /**
   * createBooking - Создаёт новое бронирование с защитой от race conditions
   *
   * Алгоритм:
   * 1. Начинает транзакцию (BEGIN)
   * 2. Блокирует строку события (SELECT ... FOR UPDATE)
   * 3. Проверяет количество существующих бронирований
   * 4. Проверяет что есть свободные места
   * 5. Создаёт бронирование (INSERT)
   * 6. Фиксирует транзакцию (COMMIT)
   * 7. В случае ошибки откатывает (ROLLBACK)
   *
   * ЗАЩИТА ОТ RACE CONDITIONS:
   * SELECT ... FOR UPDATE блокирует строку события, поэтому другие
   * параллельные запросы будут ждать завершения этой транзакции.
   *
   * ЗАЩИТА ОТ ДУБЛЕЙ:
   * UNIQUE INDEX (event_id, user_id) на уровне БД не позволит
   * создать дубликат, даже если race condition произойдёт.
   *
   * @param {number} eventId - ID события для бронирования
   * @param {string} userId - Идентификатор пользователя
   * @returns {Promise<Booking>} Созданное бронирование
   * @throws {NotFoundException} Если событие не существует
   * @throws {ConflictException} Если нет свободных мест или пользователь уже забронировал
   */
  async createBooking(eventId: number, userId: string): Promise<Booking> {
    const client: PoolClient = await this.pool.connect();

    try {
      // ========== ШАГ 1: НАЧАЛО ТРАНЗАКЦИИ ==========
      await client.query('BEGIN');

      // ========== ШАГ 2: БЛОКИРОВКА СТРОКИ СОБЫТИЯ ==========
      // FOR UPDATE блокирует эту строку до конца транзакции
      const eventResult = await client.query(
        'SELECT id, name, total_seats FROM events WHERE id = $1 FOR UPDATE',
        [eventId],
      );

      // ========== ШАГ 3: ПРОВЕРКА СУЩЕСТВОВАНИЯ СОБЫТИЯ ==========
      if (eventResult.rows.length === 0) {
        throw new NotFoundException(`Event with id ${eventId} not found`);
      }

      const event = eventResult.rows[0];

      // ========== ШАГ 4: ПОДСЧЁТ ТЕКУЩИХ БРОНИРОВАНИЙ ==========
      const countResult = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1',
        [eventId],
      );

      const currentBookings = parseInt(countResult.rows[0].count, 10);

      // ========== ШАГ 5: ПРОВЕРКА ДОСТУПНОСТИ МЕСТ ==========
      if (currentBookings >= event.total_seats) {
        throw new ConflictException('No seats available for this event');
      }

      // ========== ШАГ 6: СОЗДАНИЕ БРОНИРОВАНИЯ ==========
      const insertResult = await client.query<Booking>(
        `INSERT INTO bookings (event_id, user_id)
         VALUES ($1, $2)
         RETURNING id, event_id, user_id, created_at`,
        [eventId, userId],
      );

      // ========== ШАГ 7: ФИКСАЦИЯ ТРАНЗАКЦИИ ==========
      await client.query('COMMIT');

      return insertResult.rows[0];
    } catch (error: unknown) {
      // ========== ОБРАБОТКА ОШИБОК ==========
      await client.query('ROLLBACK');

      // Проверяем тип ошибки PostgreSQL
      // 23505 = unique_violation (нарушение UNIQUE constraint)
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('User has already booked this event');
      }

      // Пробрасываем другие ошибки
      throw error;
    } finally {
      // ========== ОСВОБОЖДЕНИЕ КЛИЕНТА ==========
      client.release();
    }
  }

  /**
   * getBookingsByEventId - Получает все бронирования для конкретного события
   *
   * @param {number} eventId - ID события
   * @returns {Promise<Booking[]>} Массив бронирований
   */
  async getBookingsByEventId(eventId: number): Promise<Booking[]> {
    const result = await this.pool.query<Booking>(
      'SELECT id, event_id, user_id, created_at FROM bookings WHERE event_id = $1 ORDER BY created_at DESC',
      [eventId],
    );

    return result.rows;
  }

  /**
   * getBookingsByUserId - Получает все бронирования конкретного пользователя
   *
   * @param {string} userId - Идентификатор пользователя
   * @returns {Promise<Booking[]>} Массив бронирований пользователя
   */
  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    const result = await this.pool.query<Booking>(
      'SELECT id, event_id, user_id, created_at FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );

    return result.rows;
  }

  /**
   * checkBookingExists - Проверяет существует ли бронирование
   *
   * @param {number} eventId - ID события
   * @param {string} userId - ID пользователя
   * @returns {Promise<boolean>} true если бронирование существует
   */
  async checkBookingExists(eventId: number, userId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM bookings WHERE event_id = $1 AND user_id = $2)',
      [eventId, userId],
    );

    return result.rows[0].exists;
  }
}
