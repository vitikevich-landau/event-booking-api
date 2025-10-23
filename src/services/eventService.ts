/**
 * EVENT SERVICE
 *
 * Содержит бизнес-логику для работы с событиями.
 * Промежуточный слой между контроллерами и репозиториями.
 *
 * Обязанности:
 * - Координация получения данных о событиях
 * - Обогащение данных (например, добавление доступных мест)
 * - Логирование операций
 * - Реализация бизнес-правил для событий
 *
 * НЕ отвечает за:
 * - SQL запросы (это делает eventRepository)
 * - HTTP обработку (это делает eventController)
 * - Валидацию (это делает middleware)
 */

import eventRepository from '../repositories/eventRepository';
import { Event } from '../types';
import logger from '../utils/logger';

/**
 * EventWithAvailability - Событие с информацией о доступных местах
 *
 * Расширяет базовый тип Event, добавляя информацию о доступности.
 * Это пример как сервис может обогащать данные из репозиториев.
 *
 * @property {number} id - ID события
 * @property {string} name - Название события
 * @property {number} total_seats - Общее количество мест
 * @property {Date} created_at - Дата создания
 * @property {number} available_seats - Свободных мест (вычисляется)
 *
 * @example
 * {
 *   id: 1,
 *   name: "Tech Conference 2025",
 *   total_seats: 100,
 *   created_at: "2025-01-15T10:00:00.000Z",
 *   available_seats: 85  // ← Добавлено сервисом
 * }
 */
export interface EventWithAvailability extends Event {
  available_seats: number;
}

/**
 * EventService - Сервис для бизнес-логики событий
 *
 * Паттерн Service Layer для изоляции бизнес-логики.
 * Преимущества:
 * - Переиспользование в разных контроллерах
 * - Композиция данных из нескольких источников
 * - Легко тестировать
 * - Чистое разделение ответственности
 */
export class EventService {
  /**
   * getAllEvents - Получает список всех событий
   *
   * Бизнес-логика:
   * 1. Логирует запрос
   * 2. Получает события из репозитория
   * 3. Возвращает результат
   *
   * Почему так просто?
   * - Пока нет сложной бизнес-логики для списка событий
   * - В будущем можно добавить:
   *   * Фильтрацию по категориям
   *   * Сортировку по разным полям
   *   * Добавление available_seats для каждого
   *   * Пагинацию
   *
   * Зачем тогда сервис если он просто прокси?
   * - Единая точка входа для работы с событиями
   * - Логирование
   * - Готовность к расширению
   * - Изоляция контроллера от репозитория
   *
   * @returns {Promise<Event[]>} Массив всех событий
   *
   * @example Использование в контроллере:
   * const events = await eventService.getAllEvents();
   * res.json(events);
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
    // Логируем запрос для отладки и мониторинга
    logger.info('Fetching all events');

    // Получаем события из репозитория
    return await eventRepository.getAllEvents();
  }

  /**
   * getEventById - Получает одно событие по ID
   *
   * Бизнес-логика:
   * 1. Логирует запрос с контекстом (какой ID)
   * 2. Получает событие из репозитория
   * 3. Возвращает результат
   *
   * Репозиторий сам бросит NotFoundError если события нет
   * Сервису не нужно дополнительно проверять
   *
   * @param {number} id - ID события
   * @returns {Promise<Event>} Объект события
   * @throws {NotFoundError} Если событие не найдено
   *
   * @example Использование:
   * const event = await eventService.getEventById(1);
   * console.log(event.name); // "Tech Conference 2025"
   *
   * @example Ответ:
   * {
   *   id: 1,
   *   name: "Tech Conference 2025",
   *   total_seats: 100,
   *   created_at: "2025-01-15T10:00:00.000Z"
   * }
   */
  async getEventById(id: number): Promise<Event> {
    // Логируем с контекстом - какое событие запрашивается
    logger.info('Fetching event by id', { id });

    // Получаем из репозитория
    // Если не найдено - репозиторий бросит NotFoundError
    return await eventRepository.getEventById(id);
  }

  /**
   * getEventWithAvailability - Получает событие с информацией о доступных местах
   *
   * Бизнес-логика:
   * 1. Логирует запрос
   * 2. Получает базовую информацию о событии
   * 3. Вычисляет количество доступных мест
   * 4. Комбинирует данные в один объект
   * 5. Возвращает обогащённый результат
   *
   * Это пример как сервис КОМБИНИРУЕТ данные из репозиториев.
   * Контроллер получает всё в одном объекте, не зная как это собрано.
   *
   * Почему два отдельных запроса, а не один JOIN?
   * - Разделение ответственности: репозиторий не знает о "бизнес-объектах"
   * - Переиспользование: используем существующие методы репозитория
   * - Гибкость: легко изменить логику вычисления доступности
   *
   * В чём минус?
   * - Два запроса к БД вместо одного
   * - Можно оптимизировать добавив getEventWithAvailability в репозиторий
   *
   * Когда оптимизировать?
   * - Если этот эндпоинт вызывается очень часто
   * - Если latency критична
   * - Сейчас оптимизация преждевременна
   *
   * @param {number} id - ID события
   * @returns {Promise<EventWithAvailability>} Событие + доступные места
   * @throws {NotFoundError} Если событие не найдено
   *
   * @example Использование в контроллере:
   * const event = await eventService.getEventWithAvailability(1);
   * res.json(event);
   *
   * @example Ответ:
   * {
   *   id: 1,
   *   name: "Tech Conference 2025",
   *   total_seats: 100,
   *   created_at: "2025-01-15T10:00:00.000Z",
   *   available_seats: 85  // ← Вычислено сервисом
   * }
   */
  async getEventWithAvailability(id: number): Promise<EventWithAvailability> {
    // Логируем запрос с контекстом
    logger.info('Fetching event with availability', { id });

    // ========== ШАГ 1: ПОЛУЧАЕМ БАЗОВУЮ ИНФОРМАЦИЮ ==========
    // Получаем событие из репозитория
    // Если не найдено - бросится NotFoundError
    const event = await eventRepository.getEventById(id);

    // ========== ШАГ 2: ВЫЧИСЛЯЕМ ДОСТУПНЫЕ МЕСТА ==========
    // Вызываем другой метод репозитория для подсчёта
    // Это может быть отдельный запрос к БД
    const availableSeats = await eventRepository.getAvailableSeats(id);

    // ========== ШАГ 3: КОМБИНИРУЕМ ДАННЫЕ ==========
    // Используем spread оператор для копирования всех полей event
    // Добавляем новое поле available_seats
    return {
      ...event,
      available_seats: availableSeats,
    };
  }
}

/**
 * Экспорт singleton instance
 *
 * Создаём единственный экземпляр сервиса.
 * Все контроллеры используют этот же экземпляр.
 */
export default new EventService();

/**
 * ВОЗМОЖНЫЕ РАСШИРЕНИЯ:
 *
 * 1. Список событий с доступностью:
 * async getAllEventsWithAvailability(): Promise<EventWithAvailability[]> {
 *   logger.info('Fetching all events with availability');
 *
 *   const events = await eventRepository.getAllEvents();
 *
 *   // Параллельно получаем доступность для всех событий
 *   const eventsWithAvailability = await Promise.all(
 *     events.map(async (event) => {
 *       const available = await eventRepository.getAvailableSeats(event.id);
 *       return { ...event, available_seats: available };
 *     })
 *   );
 *
 *   return eventsWithAvailability;
 * }
 *
 * 2. Фильтрация по доступности:
 * async getAvailableEvents(): Promise<EventWithAvailability[]> {
 *   const events = await this.getAllEventsWithAvailability();
 *   return events.filter(e => e.available_seats > 0);
 * }
 *
 * 3. Поиск событий:
 * async searchEvents(query: string): Promise<Event[]> {
 *   logger.info('Searching events', { query });
 *
 *   // В репозитории добавить метод searchEvents
 *   return await eventRepository.searchEvents(query);
 * }
 *
 * 4. Популярные события (по количеству бронирований):
 * async getPopularEvents(limit: number = 10): Promise<EventWithStats[]> {
 *   const events = await eventRepository.getAllEvents();
 *
 *   // Получаем статистику для каждого
 *   const eventsWithStats = await Promise.all(
 *     events.map(async (event) => {
 *       const bookings = await bookingRepository.getBookingsByEventId(event.id);
 *       return {
 *         ...event,
 *         bookings_count: bookings.length
 *       };
 *     })
 *   );
 *
 *   // Сортируем по популярности и берём топ
 *   return eventsWithStats
 *     .sort((a, b) => b.bookings_count - a.bookings_count)
 *     .slice(0, limit);
 * }
 *
 * 5. Создание события с валидацией:
 * async createEvent(name: string, totalSeats: number): Promise<Event> {
 *   logger.info('Creating event', { name, totalSeats });
 *
 *   // Бизнес-правила
 *   if (totalSeats < 1) {
 *     throw new BadRequestError('Event must have at least 1 seat');
 *   }
 *   if (totalSeats > 10000) {
 *     throw new BadRequestError('Event cannot have more than 10000 seats');
 *   }
 *   if (name.length < 3) {
 *     throw new BadRequestError('Event name too short');
 *   }
 *
 *   return await eventRepository.createEvent(name, totalSeats);
 * }
 *
 * 6. Статистика события:
 * interface EventStats {
 *   event: Event;
 *   total_bookings: number;
 *   available_seats: number;
 *   occupancy_rate: number; // процент заполненности
 * }
 *
 * async getEventStats(id: number): Promise<EventStats> {
 *   const event = await eventRepository.getEventById(id);
 *   const available = await eventRepository.getAvailableSeats(id);
 *   const totalBookings = event.total_seats - available;
 *   const occupancyRate = (totalBookings / event.total_seats) * 100;
 *
 *   return {
 *     event,
 *     total_bookings: totalBookings,
 *     available_seats: available,
 *     occupancy_rate: Math.round(occupancyRate * 100) / 100
 *   };
 * }
 */

/**
 * ПАТТЕРНЫ КОМПОЗИЦИИ ДАННЫХ:
 *
 * 1. Параллельные запросы:
 *    Используйте Promise.all для одновременного выполнения
 *    const [event, bookings, stats] = await Promise.all([
 *      eventRepository.getEventById(id),
 *      bookingRepository.getBookingsByEventId(id),
 *      statsRepository.getEventStats(id)
 *    ]);
 *
 * 2. Вложенные объекты:
 *    Обогащайте данные связями
 *    return {
 *      ...event,
 *      bookings: await bookingRepository.getBookingsByEventId(event.id),
 *      creator: await userRepository.getUserById(event.creator_id)
 *    };
 *
 * 3. Вычисляемые поля:
 *    Добавляйте поля на основе других данных
 *    return {
 *      ...event,
 *      is_full: available_seats === 0,
 *      is_almost_full: available_seats < 10,
 *      status: available_seats === 0 ? 'full' : 'available'
 *    };
 */

/**
 * ОПТИМИЗАЦИЯ ПРОИЗВОДИТЕЛЬНОСТИ:
 *
 * 1. Кеширование:
 *    Кешировать список событий в Redis
 *    const cached = await redis.get('events:all');
 *    if (cached) return JSON.parse(cached);
 *
 *    const events = await eventRepository.getAllEvents();
 *    await redis.setex('events:all', 300, JSON.stringify(events)); // 5 мин
 *    return events;
 *
 * 2. Пакетная загрузка (DataLoader pattern):
 *    Вместо N запросов для N событий - делать 1 запрос
 *
 * 3. Денормализация:
 *    Хранить available_seats в таблице events
 *    Обновлять триггером при изменении bookings
 */
