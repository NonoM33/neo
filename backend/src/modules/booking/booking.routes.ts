import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { publicSlotsQuerySchema, publicBookingSchema } from './booking.schema';
import * as bookingService from './booking.service';
import { rateLimit } from '../../middleware/rate-limit.middleware';

const bookingRouter = new Hono();

// ─── Rate limiting (per-endpoint) ────────────────────────────────────────────
bookingRouter.use('/types', rateLimit({ maxRequests: 60, windowMs: 60_000 }));
bookingRouter.use('/slots', rateLimit({ maxRequests: 30, windowMs: 60_000 }));
bookingRouter.use('/', rateLimit({ maxRequests: 5, windowMs: 60_000 }));

// ─── GET /api/public/booking/types ───────────────────────────────────────────
// Returns appointment types available for online booking.
bookingRouter.get('/types', async (c) => {
  const types = await bookingService.getPublicAppointmentTypes();
  return c.json({ types });
});

// ─── GET /api/public/booking/slots ───────────────────────────────────────────
// Returns aggregated free time slots across all eligible staff.
bookingRouter.get(
  '/slots',
  zValidator('query', publicSlotsQuerySchema),
  async (c) => {
    const { type, fromDate, toDate } = c.req.valid('query');
    const slots = await bookingService.getAggregatedSlots(
      type,
      fromDate,
      toDate
    );
    return c.json({ slots });
  }
);

// ─── POST /api/public/booking ────────────────────────────────────────────────
// Creates a booking: lead + auto-dispatched appointment.
bookingRouter.post(
  '/',
  zValidator('json', publicBookingSchema),
  async (c) => {
    const input = c.req.valid('json');
    const result = await bookingService.createPublicBooking(input);
    return c.json(result, 201);
  }
);

export default bookingRouter;
