/**
 * ВАЛИДАТОРЫ И ZOD СХЕМЫ
 *
 * Этот файл содержит Zod схемы для валидации входящих данных.
 * Zod обеспечивает:
 * - Runtime валидацию (проверку во время выполнения)
 * - TypeScript типы (автоматическая генерация типов из схем)
 * - Понятные сообщения об ошибках
 * - Трансформацию данных (например, string → number)
 */

import { z } from 'zod';

/**
 * createBookingSchema - Схема валидации для создания бронирования
 *
 * Используется в:
 * - POST /api/bookings/reserve endpoint
 * - middleware validateBody для проверки req.body
 *
 * Правила валидации:
 * - event_id: должен быть числом, целым и положительным (> 0)
 * - user_id: должен быть строкой, минимум 1 символ, максимум 255
 *
 * @example Валидные данные:
 * { event_id: 1, user_id: "user123" }     ✅
 * { event_id: 999, user_id: "a" }         ✅
 *
 * @example Невалидные данные:
 * { event_id: -1, user_id: "test" }       ❌ event_id должен быть положительным
 * { event_id: 1.5, user_id: "test" }      ❌ event_id должен быть целым
 * { event_id: "1", user_id: "test" }      ❌ event_id должен быть числом
 * { event_id: 1, user_id: "" }            ❌ user_id не может быть пустым
 * { event_id: 1, user_id: "x".repeat(256) } ❌ user_id слишком длинный
 */
export const createBookingSchema = z.object({
  /**
   * event_id - ID события для бронирования
   *
   * Требования:
   * - Тип: number
   * - Целое число (int)
   * - Положительное (> 0)
   *
   * Пользовательское сообщение об ошибке:
   * "Event ID must be a positive integer"
   */
  event_id: z.number().int().positive('Event ID must be a positive integer'),

  /**
   * user_id - Идентификатор пользователя
   *
   * Требования:
   * - Тип: string
   * - Минимальная длина: 1 символ
   * - Максимальная длина: 255 символов
   *
   * Пользовательские сообщения об ошибках:
   * - Если пустая строка: "User ID cannot be empty"
   * - Если > 255 символов: "User ID is too long"
   */
  user_id: z.string().min(1, 'User ID cannot be empty').max(255, 'User ID is too long'),
});

/**
 * envSchema - Схема валидации переменных окружения
 *
 * Используется в:
 * - src/config/env.ts при загрузке .env файла
 * - Проверяется при старте приложения (если невалидно → EXIT)
 *
 * Правила валидации:
 * - NODE_ENV: должен быть 'development', 'production' или 'test'
 * - PORT: должен быть строкой, преобразуется в число, должен быть положительным
 * - DATABASE_URL: должен быть валидным URL
 * - LOG_LEVEL: должен быть 'error', 'warn', 'info' или 'debug'
 *
 * @example Валидные данные:
 * {
 *   NODE_ENV: "development",
 *   PORT: "3000",
 *   DATABASE_URL: "postgresql://localhost:5432/db",
 *   LOG_LEVEL: "info"
 * }
 */
export const envSchema = z.object({
  /**
   * NODE_ENV - Режим работы приложения
   *
   * Допустимые значения:
   * - 'development': разработка (больше логов, hot-reload)
   * - 'production': продакшн (минимум логов, оптимизации)
   * - 'test': тестирование (специальные настройки для тестов)
   *
   * По умолчанию: 'development'
   */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  /**
   * PORT - Порт HTTP сервера
   *
   * Особенности:
   * 1. Приходит как string из process.env
   * 2. .transform(Number) преобразует в число
   * 3. .pipe(z.number()...) валидирует как число
   * 4. Должен быть целым и положительным
   *
   * По умолчанию: '3000'
   *
   * @example
   * PORT="3000" → преобразуется в number 3000
   */
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),

  /**
   * DATABASE_URL - Строка подключения к PostgreSQL
   *
   * Требования:
   * - Должен быть валидным URL
   * - Формат: postgresql://user:password@host:port/database
   *
   * @example
   * postgresql://postgres:postgres@localhost:5432/event_booking
   * postgresql://user:pass@postgres.example.com:5432/mydb
   */
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  /**
   * LOG_LEVEL - Уровень логирования
   *
   * Допустимые значения (от минимального к максимальному):
   * - 'error': только критичные ошибки
   * - 'warn': предупреждения + ошибки
   * - 'info': информационные сообщения + warn + error
   * - 'debug': всё, включая отладочную информацию
   *
   * По умолчанию: 'info'
   *
   * @example
   * Если LOG_LEVEL="error", то будут логироваться только ошибки
   * Если LOG_LEVEL="debug", то будут логироваться все уровни
   */
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

/**
 * TYPE INFERENCE
 *
 * z.infer<typeof schema> извлекает TypeScript тип из Zod схемы
 * Это позволяет использовать одну схему и для валидации, и для типизации
 */

/**
 * CreateBookingInput - TypeScript тип, сгенерированный из createBookingSchema
 *
 * Эквивалентен:
 * type CreateBookingInput = {
 *   event_id: number;
 *   user_id: string;
 * }
 *
 * Используется для типизации параметров функций
 */
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * EnvConfig - TypeScript тип, сгенерированный из envSchema
 *
 * Эквивалентен:
 * type EnvConfig = {
 *   NODE_ENV: 'development' | 'production' | 'test';
 *   PORT: number;
 *   DATABASE_URL: string;
 *   LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
 * }
 *
 * Используется в src/config/env.ts
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * КАК ЭТО РАБОТАЕТ ВМЕСТЕ:
 *
 * 1. Определяем Zod схему с правилами валидации
 * 2. Извлекаем TypeScript тип через z.infer
 * 3. Используем схему для runtime валидации
 * 4. Используем тип для compile-time проверки
 *
 * @example Использование в контроллере:
 *
 * // req.body автоматически типизирован как CreateBookingInput
 * async createBooking(req: Request<{}, {}, CreateBookingInput>) {
 *   const { event_id, user_id } = req.body;
 *   // TypeScript знает, что event_id это number, а user_id это string
 * }
 *
 * @example Использование в middleware:
 *
 * router.post(
 *   '/reserve',
 *   validateBody(createBookingSchema),  // Runtime валидация
 *   controller.createBooking            // TypeScript типы из схемы
 * );
 */
