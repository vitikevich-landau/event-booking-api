import { Request, Response, NextFunction } from 'express';
import bookingService from '../services/bookingService';
import { CreateBookingInput } from '../validators';

export class BookingController {
  async createBooking(
    req: Request<object, object, CreateBookingInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { event_id, user_id } = req.body;

      const booking = await bookingService.createBooking(event_id, user_id);

      res.status(201).json(booking);
    } catch (error) {
      next(error);
    }
  }

  async getBookingsByEventId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = parseInt(req.params.eventId, 10);

      if (isNaN(eventId)) {
        res.status(400).json({ error: 'Invalid event ID' });
        return;
      }

      const bookings = await bookingService.getBookingsByEventId(eventId);

      res.status(200).json(bookings);
    } catch (error) {
      next(error);
    }
  }

  async getBookingsByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const bookings = await bookingService.getBookingsByUserId(userId);

      res.status(200).json(bookings);
    } catch (error) {
      next(error);
    }
  }
}

export default new BookingController();
