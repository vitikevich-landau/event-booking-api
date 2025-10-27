import { Injectable, Logger } from '@nestjs/common';
import { EventsRepository } from './events.repository';
import { Event, EventWithAvailability } from './entities/event.entity';

/**
 * EventsService
 *
 * Содержит бизнес-логику для работы с событиями.
 * Промежуточный слой между контроллерами и репозиториями.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventsRepository: EventsRepository) {}

  /**
   * getAllEvents - Получает список всех событий
   *
   * @returns {Promise<Event[]>} Массив всех событий
   */
  async getAllEvents(): Promise<Event[]> {
    this.logger.log('Fetching all events');
    return await this.eventsRepository.getAllEvents();
  }

  /**
   * getEventById - Получает одно событие по ID
   *
   * @param {number} id - ID события
   * @returns {Promise<Event>} Объект события
   * @throws {NotFoundException} Если событие не найдено
   */
  async getEventById(id: number): Promise<Event> {
    this.logger.log(`Fetching event by id: ${id}`);
    return await this.eventsRepository.getEventById(id);
  }

  /**
   * getEventWithAvailability - Получает событие с информацией о доступных местах
   *
   * Бизнес-логика:
   * 1. Получает базовую информацию о событии
   * 2. Вычисляет количество доступных мест
   * 3. Комбинирует данные в один объект
   *
   * @param {number} id - ID события
   * @returns {Promise<EventWithAvailability>} Событие + доступные места
   * @throws {NotFoundException} Если событие не найдено
   */
  async getEventWithAvailability(id: number): Promise<EventWithAvailability> {
    this.logger.log(`Fetching event with availability: ${id}`);

    // Получаем базовую информацию о событии
    const event = await this.eventsRepository.getEventById(id);

    // Вычисляем доступные места
    const availableSeats = await this.eventsRepository.getAvailableSeats(id);

    // Комбинируем данные
    return {
      ...event,
      available_seats: availableSeats,
    };
  }
}
