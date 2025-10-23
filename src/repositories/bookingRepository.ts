/**
 * BOOKING REPOSITORY
 *
 * Отвечает за работу с таблицей bookings в базе данных.
 * Это единственное место в приложении, где выполняются SQL запросы к bookings.
 *
 * Обязанности:
 * - CRUD операции с бронированиями
 * - Управление транзакциями
 * - Защита от race conditions
 * - Обработка ошибок БД
 *
 * НЕ отвечает за:
 * - Бизнес-логику (это делает bookingService)
 * - Валидацию входных данных (это делает middleware)
 * - HTTP обработку (это делает controller)
 */

import pool from '../config/database';
import { Booking, Event } from '../types';
import { NotFoundError, ConflictError } from '../utils/errors';

/**
 * BookingRepository - Класс для работы с таблицей bookings
 *
 * Паттерн Repository изолирует логику доступа к данным от бизнес-логики.
 * Преимущества:
 * - Легко тестировать (можно мокировать репозиторий)
 * - Легко менять БД (весь SQL в одном месте)
 * - Чистая архитектура (слои не смешиваются)
 */
export class BookingRepository {
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
   * @throws {NotFoundError} Если событие не существует
   * @throws {ConflictError} Если нет свободных мест или пользователь уже забронировал
   *
   * @example Использование:
   * const booking = await bookingRepository.createBooking(1, 'user123');
   * console.log(booking); // { id: 1, event_id: 1, user_id: 'user123', created_at: Date }
   */
  async createBooking(eventId: number, userId: string): Promise<Booking> {
    // Получаем клиент из пула соединений
    // client нужен для управления транзакцией (BEGIN/COMMIT/ROLLBACK)
    const client = await pool.connect();

    try {
      // ========== ШАГ 1: НАЧАЛО ТРАНЗАКЦИИ ==========
      // Все следующие запросы будут в рамках одной транзакции
      // Либо все выполнятся, либо все откатятся
      await client.query('BEGIN');

      // ========== ШАГ 2: БЛОКИРОВКА СТРОКИ СОБЫТИЯ ==========
      // FOR UPDATE блокирует эту строку до конца транзакции
      // Другие запросы будут ждать, пока мы не сделаем COMMIT или ROLLBACK
      // Это предотвращает race condition при проверке свободных мест
      const eventResult = await client.query<Event>(
        'SELECT id, name, total_seats FROM events WHERE id = $1 FOR UPDATE',
        [eventId]
      );

      // ========== ШАГ 3: ПРОВЕРКА СУЩЕСТВОВАНИЯ СОБЫТИЯ ==========
      if (eventResult.rows.length === 0) {
        throw new NotFoundError(`Event with id ${eventId} not found`);
      }

      const event = eventResult.rows[0];

      // ========== ШАГ 4: ПОДСЧЁТ ТЕКУЩИХ БРОНИРОВАНИЙ ==========
      // COUNT(*) возвращает количество бронирований для этого события
      const countResult = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1',
        [eventId]
      );

      // PostgreSQL возвращает COUNT как string, конвертируем в number
      const currentBookings = parseInt(countResult.rows[0].count, 10);

      // ========== ШАГ 5: ПРОВЕРКА ДОСТУПНОСТИ МЕСТ ==========
      if (currentBookings >= event.total_seats) {
        // Места закончились - бросаем ошибку
        throw new ConflictError('No seats available for this event');
      }

      // ========== ШАГ 6: СОЗДАНИЕ БРОНИРОВАНИЯ ==========
      // INSERT создаёт новую запись и возвращает её (RETURNING)
      // UNIQUE INDEX (event_id, user_id) защитит от дублей
      const insertResult = await client.query<Booking>(
        `INSERT INTO bookings (event_id, user_id) 
         VALUES ($1, $2) 
         RETURNING id, event_id, user_id, created_at`,
        [eventId, userId]
      );

      // ========== ШАГ 7: ФИКСАЦИЯ ТРАНЗАКЦИИ ==========
      // Все изменения сохраняются в БД
      // Блокировка снимается
      await client.query('COMMIT');

      // Возвращаем созданное бронирование
      return insertResult.rows[0];
    } catch (error: unknown) {
      // ========== ОБРАБОТКА ОШИБОК ==========
      // Откатываем все изменения в транзакции
      await client.query('ROLLBACK');

      // Проверяем тип ошибки PostgreSQL
      // 23505 = unique_violation (нарушение UNIQUE constraint)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        // Пользователь уже забронировал это событие
        throw new ConflictError('User has already booked this event');
      }

      // Если это не известная ошибка - пробрасываем дальше
      throw error;
    } finally {
      // ========== ОСВОБОЖДЕНИЕ КЛИЕНТА ==========
      // ОБЯЗАТЕЛЬНО возвращаем клиент в пул!
      // Иначе пул переполнится и новые запросы будут висеть
      client.release();
    }
  }

  /**
   * getBookingsByEventId - Получает все бронирования для конкретного события
   *
   * Используется для:
   * - Отображения списка участников события
   * - Проверки кто забронировал
   * - Статистики по событию
   *
   * @param {number} eventId - ID события
   * @returns {Promise<Booking[]>} Массив бронирований, отсортированных по дате (новые первые)
   *
   * @example Использование:
   * const bookings = await bookingRepository.getBookingsByEventId(1);
   * console.log(bookings.length); // Количество бронирований
   */
  async getBookingsByEventId(eventId: number): Promise<Booking[]> {
    // Простой SELECT запрос
    // ORDER BY created_at DESC - новые бронирования первые
    const result = await pool.query<Booking>(
      'SELECT id, event_id, user_id, created_at FROM bookings WHERE event_id = $1 ORDER BY created_at DESC',
      [eventId]
    );

    return result.rows;
  }

  /**
   * getBookingsByUserId - Получает все бронирования конкретного пользователя
   *
   * Используется для:
   * - Отображения "Мои бронирования"
   * - Проверки на что пользователь записан
   * - История бронирований пользователя
   *
   * @param {string} userId - Идентификатор пользователя
   * @returns {Promise<Booking[]>} Массив бронирований пользователя, отсортированных по дате
   *
   * @example Использование:
   * const myBookings = await bookingRepository.getBookingsByUserId('user123');
   * console.log(myBookings); // Все события на которые записан user123
   */
  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    // Простой SELECT запрос
    // ORDER BY created_at DESC - новые бронирования первые
    const result = await pool.query<Booking>(
      'SELECT id, event_id, user_id, created_at FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows;
  }

  /**
   * checkBookingExists - Проверяет существует ли бронирование
   *
   * Используется для:
   * - Быстрой проверки перед операциями
   * - Валидации без получения данных
   *
   * Более эффективно чем getBookingsByEventId, так как:
   * - Использует EXISTS (останавливается при первом совпадении)
   * - Не возвращает данные, только boolean
   *
   * @param {number} eventId - ID события
   * @param {string} userId - ID пользователя
   * @returns {Promise<boolean>} true если бронирование существует, false если нет
   *
   * @example Использование:
   * const hasBooked = await bookingRepository.checkBookingExists(1, 'user123');
   * if (hasBooked) {
   *   console.log('Пользователь уже забронировал это событие');
   * }
   */
  async checkBookingExists(eventId: number, userId: string): Promise<boolean> {
    // EXISTS возвращает true/false без выборки данных
    // Очень быстрый запрос, использует индексы
    const result = await pool.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM bookings WHERE event_id = $1 AND user_id = $2)',
      [eventId, userId]
    );

    return result.rows[0].exists;
  }
}

/**
 * Экспорт singleton instance
 *
 * Создаём один экземпляр репозитория и экспортируем его.
 * Все части приложения используют этот же экземпляр.
 *
 * Преимущества singleton:
 * - Нет дублирования экземпляров
 * - Легко мокировать в тестах
 * - Централизованное управление состоянием (если нужно)
 */
export default new BookingRepository();

/**
 * ПОЧЕМУ ИСПОЛЬЗУЮТСЯ ПАРАМЕТРИЗОВАННЫЕ ЗАПРОСЫ ($1, $2):
 *
 * ✅ ПРАВИЛЬНО (параметризованный запрос):
 * pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
 *
 * ❌ НЕПРАВИЛЬНО (конкатенация строк):
 * pool.query(`SELECT * FROM events WHERE id = ${eventId}`);
 *
 * Причины:
 * 1. SQL Injection защита
 *    Пользователь не может внедрить SQL код
 *
 * 2. Автоматическое экранирование
 *    PostgreSQL сам правильно обрабатывает спецсимволы
 *
 * 3. Производительность
 *    БД может кешировать план выполнения запроса
 */

/**
 * ИНДЕКСЫ КОТОРЫЕ ПОМОГАЮТ ЭТОМУ РЕПОЗИТОРИЮ:
 *
 * 1. PRIMARY KEY на bookings.id
 *    - Быстрый поиск по ID
 *
 * 2. INDEX idx_bookings_event_id ON bookings(event_id)
 *    - Ускоряет getBookingsByEventId
 *    - Ускоряет COUNT(*) в createBooking
 *
 * 3. INDEX idx_bookings_user_id ON bookings(user_id)
 *    - Ускоряет getBookingsByUserId
 *    - Ускоряет checkBookingExists
 *
 * 4. UNIQUE INDEX unique_user_event ON bookings(event_id, user_id)
 *    - Предотвращает дубликаты на уровне БД
 *    - Ускоряет checkBookingExists
 */
