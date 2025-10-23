import { Router } from 'express';
import bookingRoutes from './bookingRoutes';
import eventRoutes from './eventRoutes';

const router = Router();

router.use('/bookings', bookingRoutes);
router.use('/events', eventRoutes);

export default router;
