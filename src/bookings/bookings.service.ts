import { Injectable, Logger } from '@nestjs/common';
import { BookingsRepository } from './bookings.repository';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

/**
 * BookingsService
 *
 * Содержит бизнес-логику для работы с бронированиями.
 * Промежуточный слой между контроллерами и репозиториями.
 */
@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly bookingsRepository: BookingsRepository) {}

  /**
   * createBooking - Создаёт новое бронирование
   *
   * @param {CreateBookingDto} createBookingDto - Данные для создания бронирования
   * @returns {Promise<Booking>} Созданное бронирование
   * @throws {NotFoundException} Если событие не найдено
   * @throws {ConflictException} Если нет мест или пользователь уже забронировал
   */
  async createBooking(createBookingDto: CreateBookingDto): Promise<Booking> {
    this.logger.log(
      `Creating booking for event ${createBookingDto.event_id} by user ${createBookingDto.user_id}`,
    );

    return await this.bookingsRepository.createBooking(
      createBookingDto.event_id,
      createBookingDto.user_id,
    );
  }

  /**
   * getBookingsByEventId - Получает все бронирования события
   *
   * @param {number} eventId - ID события
   * @returns {Promise<Booking[]>} Массив бронирований
   */
  async getBookingsByEventId(eventId: number): Promise<Booking[]> {
    this.logger.log(`Fetching bookings for event ${eventId}`);
    return await this.bookingsRepository.getBookingsByEventId(eventId);
  }

  /**
   * getBookingsByUserId - Получает все бронирования пользователя
   *
   * @param {string} userId - ID пользователя
   * @returns {Promise<Booking[]>} Массив бронирований
   */
  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    this.logger.log(`Fetching bookings for user ${userId}`);
    return await this.bookingsRepository.getBookingsByUserId(userId);
  }
}
