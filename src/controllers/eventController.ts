import { Request, Response, NextFunction } from 'express';
import eventService from '../services/eventService';

export class EventController {
  async getAllEvents(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await eventService.getAllEvents();
      res.status(200).json(events);
    } catch (error) {
      next(error);
    }
  }

  async getEventById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = parseInt(req.params.id, 10);

      if (isNaN(eventId)) {
        res.status(400).json({ error: 'Invalid event ID' });
        return;
      }

      const event = await eventService.getEventWithAvailability(eventId);
      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  }
}

export default new EventController();
