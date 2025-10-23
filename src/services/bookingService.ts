/**
 * BOOKING SERVICE
 *
 * Содержит бизнес-логику для работы с бронированиями.
 * Это промежуточный слой между контроллерами и репозиториями.
 *
 * Обязанности:
 * - Координация между несколькими репозиториями
 * - Реализация бизнес-правил
 * - Проверки перед операциями
 * - Логирование важных действий
 *
 * НЕ отвечает за:
 * - SQL запросы (это делают repositories)
 * - HTTP обработку (это делают controllers)
 * - Валидацию входных данных (это делает middleware)
 */

import bookingRepository from '../repositories/bookingRepository';
import eventRepository from '../repositories/eventRepository';
import { Booking, BookingResponse } from '../types';
import logger from '../utils/logger';

/**
 * BookingService - Сервис для бизнес-логики бронирований
 *
 * Паттерн Service Layer изолирует бизнес-логику от деталей HTTP и БД.
 * Преимущества:
 * - Переиспользование логики в разных контроллерах
 * - Легко тестировать (мокируем repositories)
 * - Чистое разделение ответственности
 * - Можно вызывать из разных мест (API, WebSocket, CLI, и т.д.)
 */
export class BookingService {
  /**
   * createBooking - Создаёт новое бронирование с проверками
   *
   * Бизнес-логика:
   * 1. Проверяет что событие существует
   * 2. Вызывает репозиторий для создания бронирования
   *    (репозиторий сам проверит доступность мест и дубликаты)
   * 3. Логирует успешное создание
   * 4. Возвращает результат с дополнительным сообщением
   *
   * Почему проверка события здесь, а не в репозитории?
   * - Это бизнес-правило: "нельзя бронировать несуществующее событие"
   * - Репозиторий тоже проверит, но это для транзакционной целостности
   * - Здесь мы делаем это явно для ясности намерений
   *
   * Почему НЕ проверяем дубликаты здесь?
   * - Это делает репозиторий в транзакции
   * - Проверка снаружи транзакции создала бы race condition
   *
   * @param {number} eventId - ID события для бронирования
   * @param {string} userId - Идентификатор пользователя
   * @returns {Promise<BookingResponse>} Созданное бронирование + сообщение
   * @throws {NotFoundError} Если событие не существует
   * @throws {ConflictError} Если нет мест или пользователь уже забронировал
   *
   * @example Использование в контроллере:
   * const booking = await bookingService.createBooking(1, 'user123');
   * res.status(201).json(booking);
   *
   * @example Успешный ответ:
   * {
   *   id: 1,
   *   event_id: 1,
   *   user_id: "user123",
   *   created_at: "2025-01-15T10:00:00.000Z",
   *   message: "Booking created successfully"
   * }
   */
  async createBooking(eventId: number, userId: string): Promise<BookingResponse> {
    // ========== ЛОГИРОВАНИЕ ==========
    // Логируем начало операции для отладки и аудита
    // Structured logging: JSON формат с контекстом
    logger.info('Creating booking', { eventId, userId });

    // ========== ПРОВЕРКА СУЩЕСТВОВАНИЯ СОБЫТИЯ ==========
    // Явная проверка что событие существует
    // Если не существует - бросит NotFoundError
    // Это бизнес-правило: нельзя бронировать то, чего нет
    await eventRepository.getEventById(eventId);

    // ========== СОЗДАНИЕ БРОНИРОВАНИЯ ==========
    // Вызываем репозиторий для работы с БД
    // Репозиторий сам:
    // - Проверит доступность мест
    // - Проверит дубликаты
    // - Создаст бронирование в транзакции
    // - Обработает ошибки БД
    const booking = await bookingRepository.createBooking(eventId, userId);

    // ========== ЛОГИРОВАНИЕ УСПЕХА ==========
    // Логируем успешное создание для аудита
    logger.info('Booking created successfully', {
      bookingId: booking.id,
      eventId,
      userId,
    });

    // ========== ФОРМИРОВАНИЕ ОТВЕТА ==========
    // Добавляем сообщение для пользователя
    // Используем spread оператор для копирования всех полей booking
    return {
      ...booking,
      message: 'Booking created successfully',
    };
  }

  /**
   * getBookingsByEventId - Получает все бронирования для события
   *
   * Бизнес-логика:
   * 1. Проверяет что событие существует
   * 2. Получает список бронирований
   * 3. Возвращает результат
   *
   * Зачем проверять событие?
   * - Хотим вернуть 404 если события нет
   * - А не пустой массив (что было бы непонятно)
   * - Это делает API более явным и понятным
   *
   * @param {number} eventId - ID события
   * @returns {Promise<Booking[]>} Список всех бронирований для этого события
   * @throws {NotFoundError} Если событие не существует
   *
   * @example Использование:
   * const bookings = await bookingService.getBookingsByEventId(1);
   * console.log(`На событие записано ${bookings.length} человек`);
   *
   * @example Ответ:
   * [
   *   {
   *     id: 1,
   *     event_id: 1,
   *     user_id: "user123",
   *     created_at: "2025-01-15T10:00:00.000Z"
   *   },
   *   {
   *     id: 2,
   *     event_id: 1,
   *     user_id: "user456",
   *     created_at: "2025-01-15T11:00:00.000Z"
   *   }
   * ]
   */
  async getBookingsByEventId(eventId: number): Promise<Booking[]> {
    // Логируем запрос
    logger.info('Fetching bookings for event', { eventId });

    // Проверяем что событие существует
    // Это бизнес-правило: запрос бронирований несуществующего события = ошибка
    await eventRepository.getEventById(eventId);

    // Получаем бронирования из репозитория
    return await bookingRepository.getBookingsByEventId(eventId);
  }

  /**
   * getBookingsByUserId - Получает все бронирования пользователя
   *
   * Бизнес-логика:
   * 1. Логирует запрос
   * 2. Получает список бронирований
   * 3. Возвращает результат
   *
   * Почему НЕ проверяем существование пользователя?
   * - У нас нет таблицы users (пока)
   * - user_id это просто строка
   * - Если бронирований нет - вернём пустой массив (это нормально)
   *
   * Что делать когда появится таблица users:
   * - Добавить проверку: await userRepository.getUserById(userId)
   * - Бросать NotFoundError если пользователь не существует
   *
   * @param {string} userId - Идентификатор пользователя
   * @returns {Promise<Booking[]>} Список всех бронирований этого пользователя
   *
   * @example Использование:
   * const myBookings = await bookingService.getBookingsByUserId('user123');
   * if (myBookings.length === 0) {
   *   console.log('У вас нет бронирований');
   * } else {
   *   console.log(`Вы записаны на ${myBookings.length} событий`);
   * }
   *
   * @example Ответ (пустой массив если нет бронирований):
   * []
   *
   * @example Ответ (есть бронирования):
   * [
   *   {
   *     id: 1,
   *     event_id: 1,
   *     user_id: "user123",
   *     created_at: "2025-01-15T10:00:00.000Z"
   *   },
   *   {
   *     id: 5,
   *     event_id: 3,
   *     user_id: "user123",
   *     created_at: "2025-01-16T14:30:00.000Z"
   *   }
   * ]
   */
  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    // Логируем запрос
    logger.info('Fetching bookings for user', { userId });

    // Получаем бронирования из репозитория
    // Если у пользователя нет бронирований - вернётся []
    return await bookingRepository.getBookingsByUserId(userId);
  }
}

/**
 * Экспорт singleton instance
 *
 * Создаём единственный экземпляр сервиса.
 * Все контроллеры используют этот же экземпляр.
 */
export default new BookingService();

/**
 * ВОЗМОЖНЫЕ РАСШИРЕНИЯ:
 *
 * 1. Отмена бронирования:
 * async cancelBooking(bookingId: number, userId: string): Promise<void> {
 *   logger.info('Cancelling booking', { bookingId, userId });
 *
 *   // Проверяем что бронирование существует и принадлежит пользователю
 *   const booking = await bookingRepository.getBookingById(bookingId);
 *   if (booking.user_id !== userId) {
 *     throw new ForbiddenError('You can only cancel your own bookings');
 *   }
 *
 *   await bookingRepository.deleteBooking(bookingId);
 *   logger.info('Booking cancelled', { bookingId });
 * }
 *
 * 2. Массовое бронирование:
 * async createBulkBookings(
 *   eventId: number,
 *   userIds: string[]
 * ): Promise<BookingResponse[]> {
 *   const event = await eventRepository.getEventById(eventId);
 *   const available = await eventRepository.getAvailableSeats(eventId);
 *
 *   if (userIds.length > available) {
 *     throw new ConflictError('Not enough seats for all users');
 *   }
 *
 *   const bookings = await Promise.all(
 *     userIds.map(userId => bookingRepository.createBooking(eventId, userId))
 *   );
 *
 *   return bookings.map(b => ({ ...b, message: 'Booking created' }));
 * }
 *
 * 3. Получение бронирования с деталями события:
 * async getBookingWithEvent(bookingId: number): Promise<BookingWithEvent> {
 *   const booking = await bookingRepository.getBookingById(bookingId);
 *   const event = await eventRepository.getEventById(booking.event_id);
 *
 *   return {
 *     ...booking,
 *     event
 *   };
 * }
 *
 * 4. Валидация времени бронирования:
 * async createBooking(eventId: number, userId: string): Promise<BookingResponse> {
 *   const event = await eventRepository.getEventById(eventId);
 *
 *   // Проверяем что событие ещё не прошло
 *   if (event.event_date < new Date()) {
 *     throw new BadRequestError('Cannot book past events');
 *   }
 *
 *   // Проверяем что не слишком рано (за 30 дней)
 *   const thirtyDaysFromNow = new Date();
 *   thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
 *   if (event.event_date > thirtyDaysFromNow) {
 *     throw new BadRequestError('Booking opens 30 days before event');
 *   }
 *
 *   // Создаём бронирование
 *   return this.createBooking(eventId, userId);
 * }
 *
 * 5. Email уведомления:
 * async createBooking(eventId: number, userId: string): Promise<BookingResponse> {
 *   const booking = await bookingRepository.createBooking(eventId, userId);
 *   const event = await eventRepository.getEventById(eventId);
 *   const user = await userRepository.getUserById(userId);
 *
 *   // Отправляем email подтверждение
 *   await emailService.sendBookingConfirmation(user.email, event, booking);
 *
 *   return { ...booking, message: 'Booking created successfully' };
 * }
 */

/**
 * ПАТТЕРНЫ ИСПОЛЬЗОВАНИЯ:
 *
 * 1. Композиция сервисов:
 *    Service может вызывать другие сервисы:
 *    - bookingService → eventService → eventRepository
 *    - bookingService → userService → userRepository
 *
 * 2. Транзакционность:
 *    Service НЕ управляет транзакциями напрямую
 *    Это делает repository, так как транзакции = детали БД
 *
 * 3. Ошибки:
 *    Service бросает бизнес-ошибки (NotFoundError, ConflictError)
 *    Технические ошибки БД обрабатывает repository
 *
 * 4. Логирование:
 *    Service логирует бизнес-события
 *    Repository логирует технические события БД
 */
