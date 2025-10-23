/**
 * ТИПЫ ДАННЫХ ПРИЛОЖЕНИЯ
 *
 * Этот файл содержит все TypeScript интерфейсы и типы, используемые в приложении.
 * Типы помогают обеспечить типобезопасность и автодополнение в IDE.
 */

/**
 * Event - Представляет событие/мероприятие
 *
 * Используется для:
 * - Чтения данных из таблицы events
 * - Отображения информации о событиях клиенту
 *
 * @property {number} id - Уникальный идентификатор события (автоинкремент в БД)
 * @property {string} name - Название события (например: "Tech Conference 2025")
 * @property {number} total_seats - Общее количество мест на событии
 * @property {Date} created_at - Дата и время создания записи в БД
 *
 * @example
 * const event: Event = {
 *   id: 1,
 *   name: "Tech Conference 2025",
 *   total_seats: 100,
 *   created_at: new Date()
 * };
 */
export interface Event {
  id: number;
  name: string;
  total_seats: number;
  created_at: Date;
}

/**
 * Booking - Представляет бронирование места на событие
 *
 * Используется для:
 * - Чтения данных из таблицы bookings
 * - Отображения информации о бронированиях
 *
 * @property {number} id - Уникальный идентификатор бронирования
 * @property {number} event_id - ID события (внешний ключ на events.id)
 * @property {string} user_id - Идентификатор пользователя (может быть email, username и т.д.)
 * @property {Date} created_at - Дата и время создания бронирования
 *
 * @example
 * const booking: Booking = {
 *   id: 1,
 *   event_id: 1,
 *   user_id: "user123",
 *   created_at: new Date()
 * };
 */
export interface Booking {
  id: number;
  event_id: number;
  user_id: string;
  created_at: Date;
}

/**
 * CreateBookingRequest - Данные для создания нового бронирования
 *
 * Используется для:
 * - Валидации входящих данных в POST /api/bookings/reserve
 * - Типизации тела запроса в контроллере
 *
 * @property {number} event_id - ID события для бронирования (должен быть положительным)
 * @property {string} user_id - Идентификатор пользователя (не может быть пустым)
 *
 * @example
 * // Клиент отправляет:
 * POST /api/bookings/reserve
 * Body: { "event_id": 1, "user_id": "user123" }
 */
export interface CreateBookingRequest {
  event_id: number;
  user_id: string;
}

/**
 * BookingResponse - Ответ при успешном создании бронирования
 *
 * Используется для:
 * - Возврата данных клиенту после создания бронирования
 * - Типизации ответа в контроллере
 *
 * Расширяет Booking, добавляя поле message для пользовательского сообщения
 *
 * @property {number} id - ID созданного бронирования
 * @property {number} event_id - ID события
 * @property {string} user_id - ID пользователя
 * @property {Date} created_at - Время создания
 * @property {string} message - Сообщение об успешном создании
 *
 * @example
 * const response: BookingResponse = {
 *   id: 1,
 *   event_id: 1,
 *   user_id: "user123",
 *   created_at: new Date(),
 *   message: "Booking created successfully"
 * };
 */
export interface BookingResponse {
  id: number;
  event_id: number;
  user_id: string;
  created_at: Date;
  message: string;
}

/**
 * ErrorResponse - Формат ответа при ошибке
 *
 * Используется для:
 * - Единообразного формата всех ошибок API
 * - Типизации ответов в errorHandler middleware
 *
 * @property {string} error - Тип/название ошибки (например: "ValidationError", "NotFoundError")
 * @property {string} message - Человекочитаемое описание ошибки
 * @property {unknown} [details] - Опциональные дополнительные детали (например, список полей с ошибками)
 *
 * @example
 * // 404 Not Found
 * {
 *   "error": "NotFoundError",
 *   "message": "Event with id 999 not found"
 * }
 *
 * @example
 * // 400 Validation Error
 * {
 *   "error": "ValidationError",
 *   "message": "Invalid request data",
 *   "details": [
 *     { "path": ["event_id"], "message": "Expected number, received string" }
 *   ]
 * }
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}
