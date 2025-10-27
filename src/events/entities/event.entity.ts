/**
 * Event Entity
 *
 * Представляет событие/мероприятие в системе.
 * Это TypeScript interface, используемый для типизации данных из БД.
 */
export interface Event {
  id: number;
  name: string;
  total_seats: number;
  created_at: Date;
}

/**
 * EventWithAvailability
 *
 * Расширенная версия события с информацией о доступных местах.
 * Используется для endpoint'а GET /api/events/:id
 */
export interface EventWithAvailability extends Event {
  available_seats: number;
}
