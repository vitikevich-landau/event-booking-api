/**
 * CUSTOM ERROR КЛАССЫ
 *
 * Этот файл содержит пользовательские классы ошибок для приложения.
 *
 * Зачем нужны custom errors:
 * 1. Семантика: Явно показывают ТИП ошибки (не найдено, конфликт, и т.д.)
 * 2. HTTP статусы: Автоматически связаны с правильными HTTP кодами
 * 3. Централизованная обработка: errorHandler middleware знает как их обрабатывать
 * 4. Типобезопасность: TypeScript может проверить тип ошибки
 * 5. Отладка: Понятные названия ошибок в логах и stack traces
 */

/**
 * AppError - Базовый класс для всех ошибок приложения
 *
 * Наследуется от встроенного класса Error
 * Все остальные классы ошибок наследуются от AppError
 *
 * @property {number} statusCode - HTTP статус код для этой ошибки
 * @property {string} message - Человекочитаемое описание ошибки
 * @property {boolean} isOperational - Флаг, указывающий на операционную ошибку
 *                                     (true = ожидаемая ошибка, false = критический баг)
 *
 * @example Использование:
 * throw new AppError(500, 'Something went wrong');
 *
 * @example Проверка типа ошибки:
 * if (error instanceof AppError) {
 *   // Это наша кастомная ошибка
 *   res.status(error.statusCode).json({ error: error.message });
 * }
 */
export class AppError extends Error {
  /**
   * Конструктор AppError
   *
   * @param {number} statusCode - HTTP код ответа (например: 404, 500)
   * @param {string} message - Сообщение об ошибке для пользователя
   * @param {boolean} isOperational - Операционная ошибка или критический баг?
   *                                  true (по умолчанию) = ожидаемая ошибка
   *                                  false = неожиданная критическая ошибка
   */
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    // Вызываем конструктор родительского класса Error
    super(message);

    // Устанавливаем правильный прототип для instanceof проверок
    // Необходимо для корректной работы наследования в TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * NotFoundError - Ресурс не найден (HTTP 404)
 *
 * Используется когда:
 * - Запрашиваемый ресурс не существует в БД
 * - ID не найден
 * - Маршрут не существует
 *
 * HTTP статус: 404 Not Found
 *
 * @example Использование в repository:
 * const event = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
 * if (event.rows.length === 0) {
 *   throw new NotFoundError(`Event with id ${id} not found`);
 * }
 *
 * @example Ответ клиенту:
 * {
 *   "error": "NotFoundError",
 *   "message": "Event with id 999 not found"
 * }
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} message - Описание того, что не найдено
   *                           По умолчанию: 'Resource not found'
   */
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

/**
 * BadRequestError - Некорректный запрос (HTTP 400)
 *
 * Используется когда:
 * - Невалидные параметры запроса
 * - Некорректный формат данных
 * - Логическая ошибка в запросе пользователя
 *
 * HTTP статус: 400 Bad Request
 *
 * @example Использование в controller:
 * const eventId = parseInt(req.params.id);
 * if (isNaN(eventId)) {
 *   throw new BadRequestError('Event ID must be a number');
 * }
 *
 * @example Ответ клиенту:
 * {
 *   "error": "BadRequestError",
 *   "message": "Event ID must be a number"
 * }
 */
export class BadRequestError extends AppError {
  /**
   * @param {string} message - Описание проблемы с запросом
   *                           По умолчанию: 'Bad request'
   */
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

/**
 * ConflictError - Конфликт с текущим состоянием (HTTP 409)
 *
 * Используется когда:
 * - Попытка создать дублирующую запись (нарушение UNIQUE constraint)
 * - Нет доступных мест на событие
 * - Ресурс уже существует
 * - Операция конфликтует с бизнес-логикой
 *
 * HTTP статус: 409 Conflict
 *
 * @example Использование при дубликате:
 * // PostgreSQL вернул код ошибки '23505' (unique constraint violation)
 * if (error.code === '23505') {
 *   throw new ConflictError('User has already booked this event');
 * }
 *
 * @example Использование при нехватке мест:
 * if (currentBookings >= event.total_seats) {
 *   throw new ConflictError('No seats available for this event');
 * }
 *
 * @example Ответ клиенту:
 * {
 *   "error": "ConflictError",
 *   "message": "User has already booked this event"
 * }
 */
export class ConflictError extends AppError {
  /**
   * @param {string} message - Описание конфликта
   *                           По умолчанию: 'Conflict'
   */
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

/**
 * InternalServerError - Внутренняя ошибка сервера (HTTP 500)
 *
 * Используется когда:
 * - Неожиданная ошибка, которую мы не можем обработать
 * - Критический баг в коде
 * - Проблемы с внешними сервисами (БД, API)
 *
 * HTTP статус: 500 Internal Server Error
 *
 * @example Использование:
 * try {
 *   // Критическая операция
 * } catch (error) {
 *   throw new InternalServerError('Failed to process request');
 * }
 *
 * @example Ответ клиенту:
 * {
 *   "error": "InternalServerError",
 *   "message": "Internal server error"
 * }
 *
 * ⚠️ Внимание: Не показывайте детальную информацию об ошибке клиенту в production!
 */
export class InternalServerError extends AppError {
  /**
   * @param {string} message - Описание ошибки (не показывать детали в production!)
   *                           По умолчанию: 'Internal server error'
   */
  constructor(message = 'Internal server error') {
    super(500, message);
  }
}

/**
 * КАК ИСПОЛЬЗОВАТЬ ЭТИ ОШИБКИ:
 *
 * 1. В коде бросаем соответствующую ошибку:
 *    throw new NotFoundError('Event not found');
 *
 * 2. Express автоматически ловит ошибку и передаёт в error handler
 *
 * 3. Error handler middleware проверяет тип:
 *    if (error instanceof AppError) {
 *      res.status(error.statusCode).json({ error: error.message });
 *    }
 *
 * 4. Клиент получает правильный HTTP статус и сообщение
 */

/**
 * РАСШИРЕНИЕ СИСТЕМЫ:
 *
 * Чтобы добавить новую ошибку, просто создайте класс:
 *
 * export class UnauthorizedError extends AppError {
 *   constructor(message = 'Unauthorized') {
 *     super(401, message);
 *   }
 * }
 *
 * export class ForbiddenError extends AppError {
 *   constructor(message = 'Forbidden') {
 *     super(403, message);
 *   }
 * }
 *
 * export class TooManyRequestsError extends AppError {
 *   constructor(message = 'Too many requests') {
 *     super(429, message);
 *   }
 * }
 */
