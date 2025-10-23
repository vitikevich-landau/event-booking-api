import { Router } from 'express';
import bookingController from '../controllers/bookingController';
import { validateBody } from '../middleware/validate';
import { createBookingSchema } from '../validators';

const router = Router();

/**
 * POST /api/bookings/reserve
 * Создать бронирование
 */
router.post(
  '/reserve',
  validateBody(createBookingSchema),
  bookingController.createBooking.bind(bookingController)
);

/**
 * GET /api/bookings/event/:eventId
 * Получить все бронирования для события
 */
router.get(
  '/event/:eventId',
  bookingController.getBookingsByEventId.bind(bookingController)
);

/**
 * GET /api/bookings/user/:userId
 * Получить все бронирования пользователя
 */
router.get(
  '/user/:userId',
  bookingController.getBookingsByUserId.bind(bookingController)
);

export default router;
