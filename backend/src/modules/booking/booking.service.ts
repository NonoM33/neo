import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { appointments, appointmentTypeConfigs } from '../../db/schema';
import { leads } from '../../db/schema/crm';
import { users, roles, userRoles } from '../../db/schema/users';
import { ValidationError, ConflictError } from '../../lib/errors';
import { getAvailableSlots } from '../appointments/appointments.service';
import { checkConflicts } from '../appointments/appointments.conflicts';
import { dispatchAppointment } from './booking.dispatch';
import type { PublicBookingInput } from './booking.schema';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Appointment types available for public online booking. */
const PUBLIC_TYPES = ['visite_technique', 'audit', 'rdv_commercial'];

/** Default duration (minutes) per public appointment type. */
const TYPE_DURATIONS: Record<string, number> = {
  visite_technique: 90,
  audit: 120,
  rdv_commercial: 60,
};

/** Human-readable labels for public types. */
const TYPE_LABELS: Record<string, string> = {
  visite_technique: 'Visite technique',
  audit: 'Audit',
  rdv_commercial: 'RDV Commercial',
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Return the appointment types available for public online booking.
 */
export async function getPublicAppointmentTypes() {
  const configs = await db
    .select()
    .from(appointmentTypeConfigs)
    .where(eq(appointmentTypeConfigs.isActive, true));

  return configs
    .filter((c) => PUBLIC_TYPES.includes(c.type))
    .map((c) => ({
      type: c.type,
      label: c.label,
      defaultDuration: c.defaultDuration,
      color: c.color,
      icon: c.icon,
    }));
}

/**
 * Return aggregated available slots across **all** eligible users for a given
 * public appointment type.
 *
 * The caller only needs to know *which* time slots exist; the specific user
 * assignment happens later during booking via the dispatch algorithm.
 *
 * The date range is capped at 14 days to keep response sizes reasonable.
 */
export async function getAggregatedSlots(
  type: string,
  fromDate: Date,
  toDate: Date
) {
  if (!PUBLIC_TYPES.includes(type)) {
    throw new ValidationError(
      'Type de rendez-vous non disponible en ligne'
    );
  }

  // Cap the range at 14 days
  const maxDate = new Date(fromDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const effectiveToDate = toDate > maxDate ? maxDate : toDate;

  const duration = TYPE_DURATIONS[type] || 60;

  // Determine which roles may handle this type
  const [typeConfig] = await db
    .select({ allowedRoles: appointmentTypeConfigs.allowedRoles })
    .from(appointmentTypeConfigs)
    .where(eq(appointmentTypeConfigs.type, type as any))
    .limit(1);

  const configRoles = typeConfig?.allowedRoles as string[] | null | undefined;
  const allowedRoles =
    configRoles && configRoles.length > 0 ? configRoles : ['commercial'];

  // Fetch all active users
  const allUsers = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.isActive, true));

  // Resolve junction-table roles for users who might be 'commercial'
  const eligibleUserIds: string[] = [];

  for (const user of allUsers) {
    // Legacy role check
    if (allowedRoles.includes(user.role)) {
      eligibleUserIds.push(user.id);
      continue;
    }
    // Junction table check (covers 'commercial' and future roles)
    const junctionRoles = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    if (junctionRoles.some((r) => allowedRoles.includes(r.roleName))) {
      eligibleUserIds.push(user.id);
    }
  }

  if (eligibleUserIds.length === 0) return [];

  // Collect all unique slots across eligible users
  const slotMap = new Map<
    string,
    { date: string; startTime: string; endTime: string }
  >();

  for (const userId of eligibleUserIds) {
    try {
      const userSlots = await getAvailableSlots(
        userId,
        fromDate,
        effectiveToDate,
        duration
      );

      for (const slot of userSlots) {
        const key = `${slot.date}_${slot.startTime}`;
        if (!slotMap.has(key)) {
          slotMap.set(key, {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      }
    } catch {
      // Skip users whose availability can't be computed
      continue;
    }
  }

  // Sort by date, then start time
  const result = Array.from(slotMap.values());
  result.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
  });

  return result;
}

/**
 * Create a public booking from the site vitrine.
 *
 * Flow:
 * 1. Honeypot check (silent rejection of bots)
 * 2. Build & validate the requested time slot
 * 3. Auto-dispatch to the best available user (least-busy algorithm)
 * 4. Final conflict check (race-condition guard)
 * 5. Create a lead (source: site_web)
 * 6. Create the appointment (status: propose)
 */
export async function createPublicBooking(input: PublicBookingInput) {
  // ── Honeypot ──────────────────────────────────────────────────────────────
  if (input.website && input.website.length > 0) {
    // Silently "accept" so bots think they succeeded
    return {
      success: true,
      message: 'Votre rendez-vous a bien \u00e9t\u00e9 enregistr\u00e9.',
    };
  }

  const duration = TYPE_DURATIONS[input.type] || 60;

  // ── Build scheduled dates ─────────────────────────────────────────────────
  const scheduledAt = new Date(`${input.date}T${input.startTime}:00`);
  const endAt = new Date(scheduledAt.getTime() + duration * 60_000);

  if (scheduledAt <= new Date()) {
    throw new ValidationError(
      'Le cr\u00e9neau s\u00e9lectionn\u00e9 est dans le pass\u00e9'
    );
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const assigned = await dispatchAppointment(input.type, scheduledAt, endAt);

  if (!assigned) {
    throw new ConflictError(
      'Aucun cr\u00e9neau disponible pour ce type de rendez-vous. Veuillez choisir un autre horaire.'
    );
  }

  // ── Final conflict check (race condition guard) ───────────────────────────
  const conflicts = await checkConflicts(scheduledAt, endAt, [
    assigned.userId,
  ]);
  if (conflicts.length > 0) {
    throw new ConflictError(
      "Ce cr\u00e9neau vient d'\u00eatre pris. Veuillez en choisir un autre."
    );
  }

  // ── Create lead ───────────────────────────────────────────────────────────
  const leadTitle = `Demande de ${TYPE_LABELS[input.type] || input.type}`;

  const [lead] = await db
    .insert(leads)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      title: leadTitle,
      description: input.message || null,
      status: 'prospect',
      source: 'site_web',
      ownerId: assigned.userId,
      postalCode: input.postalCode,
      address: null,
      city: null,
    })
    .returning();

  if (!lead) {
    throw new Error("Erreur lors de la cr\u00e9ation du lead");
  }

  // ── Create appointment ────────────────────────────────────────────────────
  const title = `${TYPE_LABELS[input.type] || input.type} - ${input.firstName} ${input.lastName}`;

  const notes = [
    input.housingType ? `Type de logement: ${input.housingType}` : '',
    input.needs?.length ? `Besoins: ${input.needs.join(', ')}` : '',
    input.message ? `Message: ${input.message}` : '',
    `Code postal: ${input.postalCode}`,
  ]
    .filter(Boolean)
    .join('\n');

  const [appointment] = await db
    .insert(appointments)
    .values({
      title,
      type: input.type as any,
      status: 'propose',
      scheduledAt,
      endAt,
      duration,
      location: null,
      locationType: 'sur_site',
      organizerId: assigned.userId,
      leadId: lead.id,
      notes,
      metadata: {
        source: 'public_booking',
        housingType: input.housingType,
        needs: input.needs,
        postalCode: input.postalCode,
      },
    })
    .returning();

  return {
    success: true,
    appointmentId: appointment?.id,
    message:
      'Votre rendez-vous a bien \u00e9t\u00e9 enregistr\u00e9. Vous serez recontact\u00e9 sous 24h pour confirmation.',
    date: input.date,
    startTime: input.startTime,
    type: input.type,
    assignedTo: `${assigned.firstName} ${assigned.lastName}`,
  };
}
