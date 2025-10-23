import eventRepository from '../repositories/eventRepository';
import { Event } from '../types';
import logger from '../utils/logger';

export interface EventWithAvailability extends Event {
  available_seats: number;
}

export class EventService {
  async getAllEvents(): Promise<Event[]> {
    logger.info('Fetching all events');
    return await eventRepository.getAllEvents();
  }

  async getEventById(id: number): Promise<Event> {
    logger.info('Fetching event by id', { id });
    return await eventRepository.getEventById(id);
  }

  async getEventWithAvailability(id: number): Promise<EventWithAvailability> {
    logger.info('Fetching event with availability', { id });

    const event = await eventRepository.getEventById(id);
    const availableSeats = await eventRepository.getAvailableSeats(id);

    return {
      ...event,
      available_seats: availableSeats,
    };
  }
}

export default new EventService();
