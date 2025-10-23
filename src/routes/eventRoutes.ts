import { Router } from 'express';
import eventController from '../controllers/eventController';

const router = Router();

/**
 * GET /api/events
 * Получить все события
 */
router.get('/', eventController.getAllEvents.bind(eventController));

/**
 * GET /api/events/:id
 * Получить событие по ID с информацией о доступных местах
 */
router.get('/:id', eventController.getEventById.bind(eventController));

export default router;
