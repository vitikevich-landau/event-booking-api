import bookingRepository from '../repositories/bookingRepository';
import eventRepository from '../repositories/eventRepository';
import { Booking, BookingResponse } from '../types';
import logger from '../utils/logger';

export class BookingService {
  async createBooking(eventId: number, userId: string): Promise<BookingResponse> {
    logger.info('Creating booking', { eventId, userId });

    // Проверяем существование события
    await eventRepository.getEventById(eventId);

    // Создаём бронирование (с защитой от race conditions в репозитории)
    const booking = await bookingRepository.createBooking(eventId, userId);

    logger.info('Booking created successfully', {
      bookingId: booking.id,
      eventId,
      userId,
    });

    return {
      ...booking,
      message: 'Booking created successfully',
    };
  }

  async getBookingsByEventId(eventId: number): Promise<Booking[]> {
    logger.info('Fetching bookings for event', { eventId });

    // Проверяем существование события
    await eventRepository.getEventById(eventId);

    return await bookingRepository.getBookingsByEventId(eventId);
  }

  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    logger.info('Fetching bookings for user', { userId });

    return await bookingRepository.getBookingsByUserId(userId);
  }
}

export default new BookingService();
