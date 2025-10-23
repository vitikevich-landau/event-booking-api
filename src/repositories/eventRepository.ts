/**
 * EVENT REPOSITORY
 *
 * Отвечает за работу с таблицей events в базе данных.
 * Это единственное место в приложении, где выполняются SQL запросы к events.
 *
 * Обязанности:
 * - Чтение данных о событиях
 * - Подсчёт доступных мест
 * - Получение информации о событиях
 *
 * НЕ отвечает за:
 * - Создание/изменение событий (можно добавить позже)
 * - Бизнес-логику (это делает eventService)
 * - HTTP обработку (это делает controller)
 */

import pool from '../config/database';
import { Event } from '../types';
import { NotFoundError } from '../utils/errors';

/**
 * EventRepository - Класс для работы с таблицей events
 *
 * Паттерн Repository изолирует SQL запросы от остального кода.
 * Преимущества:
 * - Один источник правды для запросов к events
 * - Легко тестировать
 * - Легко менять реализацию БД
 */
export class EventRepository {
  /**
   * getAllEvents - Получает список всех событий
   *
   * Используется для:
   * - Отображения каталога событий
   * - Главной страницы со списком
   * - Выбора события для бронирования
   *
   * Сортировка:
   * - ORDER BY created_at DESC - новые события показываются первыми
   * - Можно изменить на сортировку по дате события или названию
   *
   * @returns {Promise<Event[]>} Массив всех событий
   *
   * @example Использование:
   * const events = await eventRepository.getAllEvents();
   * console.log(events.length); // Количество событий
   * events.forEach(event => {
   *   console.log(`${event.name} - ${event.total_seats} мест`);
   * });
   *
   * @example Ответ:
   * [
   *   {
   *     id: 1,
   *     name: "Tech Conference 2025",
   *     total_seats: 100,
   *     created_at: "2025-01-15T10:00:00.000Z"
   *   },
   *   {
   *     id: 2,
   *     name: "Music Festival",
   *     total_seats: 500,
   *     created_at: "2025-01-14T09:00:00.000Z"
   *   }
   * ]
   */
  async getAllEvents(): Promise<Event[]> {
    // Простой SELECT всех колонок из events
    // ORDER BY created_at DESC сортирует от новых к старым
    const result = await pool.query<Event>(
      'SELECT id, name, total_seats, created_at FROM events ORDER BY created_at DESC'
    );

    // result.rows содержит массив объектов Event
    return result.rows;
  }

  /**
   * getEventById - Получает одно событие по ID
   *
   * Используется для:
   * - Отображения детальной страницы события
   * - Проверки существования события перед бронированием
   * - Получения информации о конкретном событии
   *
   * @param {number} id - Уникальный идентификатор события
   * @returns {Promise<Event>} Объект события
   * @throws {NotFoundError} Если событие с таким ID не существует
   *
   * @example Использование:
   * try {
   *   const event = await eventRepository.getEventById(1);
   *   console.log(event.name); // "Tech Conference 2025"
   * } catch (error) {
   *   if (error instanceof NotFoundError) {
   *     console.log('Событие не найдено');
   *   }
   * }
   *
   * @example Успешный ответ:
   * {
   *   id: 1,
   *   name: "Tech Conference 2025",
   *   total_seats: 100,
   *   created_at: "2025-01-15T10:00:00.000Z"
   * }
   */
  async getEventById(id: number): Promise<Event> {
    // SELECT конкретного события по ID
    // WHERE id = $1 использует параметризованный запрос (защита от SQL injection)
    const result = await pool.query<Event>(
      'SELECT id, name, total_seats, created_at FROM events WHERE id = $1',
      [id]
    );

    // Проверяем что событие найдено
    // result.rows.length === 0 означает что запрос не вернул результатов
    if (result.rows.length === 0) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }

    // Возвращаем первую (и единственную) строку результата
    return result.rows[0];
  }

  /**
   * getAvailableSeats - Вычисляет количество свободных мест на событии
   *
   * Используется для:
   * - Отображения доступности события
   * - Проверки можно ли ещё забронировать
   * - Показа статистики по событию
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
   * @throws {NotFoundError} Если событие не существует
   *
   * @example Использование:
   * const available = await eventRepository.getAvailableSeats(1);
   * console.log(`Осталось ${available} мест`);
   *
   * if (available === 0) {
   *   console.log('Мест нет, событие заполнено!');
   * } else if (available < 10) {
   *   console.log('Торопитесь, осталось мало мест!');
   * }
   *
   * @example Как работает SQL:
   *
   * События: total_seats = 100
   * Бронирований: 15
   * Результат: 100 - 15 = 85 свободных мест
   *
   * События: total_seats = 30
   * Бронирований: 0 (нет записей в bookings)
   * Результат: 30 - 0 = 30 свободных мест (LEFT JOIN работает корректно)
   */
  async getAvailableSeats(eventId: number): Promise<number> {
    // Сложный запрос с JOIN и агрегацией
    const result = await pool.query<{ available_seats: number }>(
      `SELECT (e.total_seats - COUNT(b.id)) as available_seats
       FROM events e
       LEFT JOIN bookings b ON e.id = b.event_id
       WHERE e.id = $1
       GROUP BY e.id, e.total_seats`,
      [eventId]
    );

    // Разбор запроса по частям:
    //
    // SELECT (e.total_seats - COUNT(b.id)) as available_seats
    //   └─► Вычисляем: всего мест минус забронированных
    //
    // FROM events e
    //   └─► Основная таблица - события (псевдоним e)
    //
    // LEFT JOIN bookings b ON e.id = b.event_id
    //   └─► Присоединяем бронирования
    //   └─► LEFT JOIN означает: взять событие даже если бронирований нет
    //
    // WHERE e.id = $1
    //   └─► Фильтруем только наше событие
    //
    // GROUP BY e.id, e.total_seats
    //   └─► Группируем для использования COUNT()
    //   └─► Нужно перечислить все поля из SELECT что не в агрегатных функциях

    // Проверяем что событие существует
    if (result.rows.length === 0) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    // Возвращаем количество доступных мест
    return result.rows[0].available_seats;
  }
}

/**
 * Экспорт singleton instance
 *
 * Создаём единственный экземпляр репозитория.
 * Все части приложения используют этот же экземпляр.
 */
export default new EventRepository();

/**
 * ВОЗМОЖНЫЕ РАСШИРЕНИЯ:
 *
 * 1. Создание события:
 * async createEvent(name: string, totalSeats: number): Promise<Event> {
 *   const result = await pool.query(
 *     'INSERT INTO events (name, total_seats) VALUES ($1, $2) RETURNING *',
 *     [name, totalSeats]
 *   );
 *   return result.rows[0];
 * }
 *
 * 2. Обновление события:
 * async updateEvent(id: number, data: Partial<Event>): Promise<Event> {
 *   // UPDATE query with dynamic SET clause
 * }
 *
 * 3. Удаление события:
 * async deleteEvent(id: number): Promise<void> {
 *   await pool.query('DELETE FROM events WHERE id = $1', [id]);
 * }
 *
 * 4. Поиск событий:
 * async searchEvents(query: string): Promise<Event[]> {
 *   const result = await pool.query(
 *     'SELECT * FROM events WHERE name ILIKE $1',
 *     [`%${query}%`]
 *   );
 *   return result.rows;
 * }
 *
 * 5. Пагинация:
 * async getEventsPaginated(page: number, limit: number): Promise<Event[]> {
 *   const offset = (page - 1) * limit;
 *   const result = await pool.query(
 *     'SELECT * FROM events ORDER BY created_at DESC LIMIT $1 OFFSET $2',
 *     [limit, offset]
 *   );
 *   return result.rows;
 * }
 *
 * 6. Фильтрация по доступности:
 * async getAvailableEvents(): Promise<Event[]> {
 *   const result = await pool.query(`
 *     SELECT e.*
 *     FROM events e
 *     LEFT JOIN bookings b ON e.id = b.event_id
 *     GROUP BY e.id
 *     HAVING COUNT(b.id) < e.total_seats
 *   `);
 *   return result.rows;
 * }
 */

/**
 * ИНДЕКСЫ КОТОРЫЕ ПОМОГАЮТ ЭТОМУ РЕПОЗИТОРИЮ:
 *
 * 1. PRIMARY KEY на events.id
 *    - Ускоряет getEventById
 *    - Ускоряет JOIN в getAvailableSeats
 *
 * 2. INDEX idx_bookings_event_id ON bookings(event_id)
 *    - Ускоряет JOIN в getAvailableSeats
 *    - Ускоряет COUNT в getAvailableSeats
 *
 * 3. INDEX на events.created_at (если добавить):
 *    - Ускорит сортировку в getAllEvents
 *    - Полезно когда событий много (1000+)
 */

/**
 * ОПТИМИЗАЦИЯ ДЛЯ БОЛЬШИХ ДАННЫХ:
 *
 * Если событий и бронирований станет много (10000+), можно:
 *
 * 1. Добавить кеширование:
 *    - Redis для кеширования списка событий
 *    - Invalidация кеша при изменениях
 *
 * 2. Денормализация:
 *    - Добавить поле available_seats в таблицу events
 *    - Обновлять его триггером при INSERT/DELETE в bookings
 *    - Это ускорит чтение, но замедлит запись
 *
 * 3. Материализованные представления:
 *    - CREATE MATERIALIZED VIEW для предрасчёта доступности
 *    - Обновлять по расписанию или по триггеру
 *
 * 4. Партиционирование:
 *    - Разбить events по датам
 *    - Ускорит запросы к недавним событиям
 */
