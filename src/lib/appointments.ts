import { supabase } from './supabase'
import {
  addMinutes,
  format,
  getDay,
  parseISO,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
  eachDayOfInterval,
  addDays,
} from 'date-fns'
import type {
  Service,
  Staff,
  StaffAvailability,
  BlockedSlot,
  Appointment,
  TimeSlot,
  DaySlots,
  SlotPeriod,
  AppointmentFilters,
  BookingState,
} from '../types/appointments'

// ── Fetch helpers ─────────────────────────────────────────────

export async function fetchActiveServices(businessId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchServiceById(id: string, businessId: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .eq('business_id', businessId)
    .single()
  if (error) throw error
  return data
}

/** Returns active staff that can perform a given service.
 *  If serviceId is omitted, returns all active staff. */
export async function fetchStaffForService(serviceId: string | undefined, businessId: string): Promise<Staff[]> {
  if (serviceId) {
    const { data, error } = await supabase
      .from('staff_services')
      .select('staff_id, staff!inner(*, staff_availability(*))')
      .eq('service_id', serviceId)
      .eq('staff.is_active', true)
      .eq('staff.business_id', businessId)
    if (error) throw error
    return (data ?? []).map((row: any) => row.staff as Staff)
  }

  const { data, error } = await supabase
    .from('staff')
    .select('*, staff_availability(*)')
    .eq('is_active', true)
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchBlockedSlots(
  staffId: string,
  from: string,
  to: string,
): Promise<BlockedSlot[]> {
  const { data, error } = await supabase
    .from('blocked_slots')
    .select('*')
    .eq('staff_id', staffId)
    .lt('blocked_at', to)
    .gt('blocked_until', from)
  if (error) throw error
  return data ?? []
}

export async function fetchAppointments(
  filters: AppointmentFilters = {},
  businessId?: string,
): Promise<Appointment[]> {
  let query = supabase
    .from('appointments')
    .select('*, services(*), staff(*)')
    .order('scheduled_at', { ascending: false })

  if (businessId) query = query.eq('business_id', businessId)
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.staffId) query = query.eq('staff_id', filters.staffId)
  if (filters.serviceId) query = query.eq('service_id', filters.serviceId)
  if (filters.dateFrom) query = query.gte('scheduled_at', filters.dateFrom)
  if (filters.dateTo)   query = query.lte('scheduled_at', filters.dateTo)
  if (filters.search) {
    query = query.or(
      `client_name.ilike.%${filters.search}%,client_email.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchAppointmentById(id: string, businessId?: string): Promise<Appointment | null> {
  let query = supabase
    .from('appointments')
    .select('*, services(*), staff(*)')
    .eq('id', id)

  if (businessId) query = query.eq('business_id', businessId)

  const { data, error } = await query.single()
  if (error) throw error
  return data
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment['status'],
  adminNotes?: string
): Promise<void> {
  const patch: Partial<Appointment> = { status }
  if (status === 'cancelled') patch.cancelled_at = new Date().toISOString()
  if (adminNotes !== undefined) patch.admin_notes = adminNotes

  const { error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', id)
  if (error) throw error
}

export async function confirmCautionPayment(id: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_caution_payment', {
    p_appointment_id: id,
  })
  if (error) throw error
}

// ── Booking RPC ───────────────────────────────────────────────

export async function bookAppointment(
  state: BookingState,
  businessId: string
): Promise<string> {
  if (!state.service || !state.date || !state.time) {
    throw new Error('Dados de agendamento incompletos')
  }

  const [hh, mm] = state.time.split(':').map(Number)
  const scheduledAt = setSeconds(
    setMinutes(setHours(parseISO(state.date), hh), mm),
    0
  )
  const endsAt = addMinutes(scheduledAt, state.service.duration_min)
  const cautionAmount = Math.round(state.service.price * (state.service.caution_pct / 100) * 100) / 100

  const { data, error } = await supabase.rpc('book_appointment', {
    p_business_id:    businessId,
    p_service_id:     state.service.id,
    p_staff_id:       state.staff?.id ?? null,
    p_scheduled_at:   scheduledAt.toISOString(),
    p_ends_at:        endsAt.toISOString(),
    p_client_name:    state.clientName,
    p_client_email:   state.clientEmail,
    p_client_phone:   state.clientPhone || null,
    p_service_price:  state.service.price,
    p_caution_amount: cautionAmount,
    p_client_notes:   state.clientNotes || null,
  })
  if (error) throw error
  return data as string
}

// ── Slot computation ──────────────────────────────────────────

/** Maps hour → time-of-day period */
function hourToPeriod(hour: number): SlotPeriod {
  if (hour < 12) return 'manha'
  if (hour < 18) return 'tarde'
  return 'noite'
}

/** Parse "HH:MM:SS" into { hours, minutes } */
function parseTime(t: string): { hours: number; minutes: number } {
  const [h, m] = t.split(':').map(Number)
  return { hours: h, minutes: m }
}

/**
 * Computes available time slots for a given staff member on a single date.
 */
export function computeSlotsForDay(
  date: Date,
  durationMin: number,
  availability: StaffAvailability[],
  blockedSlots: BlockedSlot[],
  existingAppointments: Appointment[],
  slotIntervalMin = 30,
): TimeSlot[] {
  const dow = getDay(date) as StaffAvailability['day_of_week']
  const dayAvailability = availability.filter(a => a.day_of_week === dow && a.is_active)
  if (dayAvailability.length === 0) return []

  const slots: TimeSlot[] = []
  const now = new Date()

  for (const avail of dayAvailability) {
    const start = parseTime(avail.start_time)
    const end   = parseTime(avail.end_time)

    let cursor = setSeconds(
      setMinutes(setHours(startOfDay(date), start.hours), start.minutes),
      0
    )
    const endBoundary = setSeconds(
      setMinutes(setHours(startOfDay(date), end.hours), end.minutes),
      0
    )

    while (isBefore(cursor, endBoundary)) {
      const slotEnd = addMinutes(cursor, durationMin)

      if (isAfter(slotEnd, endBoundary)) break
      if (isBefore(cursor, now)) {
        cursor = addMinutes(cursor, slotIntervalMin)
        continue
      }

      const slotTime = format(cursor, 'HH:mm')
      const cursorIso = cursor.toISOString()
      const slotEndIso = slotEnd.toISOString()

      const isBlocked = blockedSlots.some(
        b => b.blocked_at < slotEndIso && b.blocked_until > cursorIso
      )

      const hasConflict = existingAppointments.some(
        appt =>
          appt.status !== 'cancelled' &&
          appt.scheduled_at < slotEndIso &&
          appt.ends_at > cursorIso
      )

      slots.push({
        time: slotTime,
        period: hourToPeriod(cursor.getHours()),
        available: !isBlocked && !hasConflict,
      })

      cursor = addMinutes(cursor, slotIntervalMin)
    }
  }

  const seen = new Set<string>()
  return slots.filter(s => {
    if (seen.has(s.time)) return false
    seen.add(s.time)
    return true
  }).sort((a, b) => a.time.localeCompare(b.time))
}

/**
 * Builds a 7-day window of DaySlots starting from `startDate`.
 */
export async function computeWeekSlots(
  startDate: Date,
  durationMin: number,
  staffId: string,
  availability: StaffAvailability[],
  businessId?: string,
): Promise<DaySlots[]> {
  const days = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) })
  const fromIso = startDate.toISOString()
  const toIso   = addDays(startDate, 7).toISOString()

  const [blocked, existing] = await Promise.all([
    fetchBlockedSlots(staffId, fromIso, toIso),
    fetchAppointments({
      staffId,
      dateFrom: fromIso,
      dateTo: toIso,
    }, businessId),
  ])

  return days.map(day => {
    const slots = computeSlotsForDay(day, durationMin, availability, blocked, existing)
    return {
      date: format(day, 'yyyy-MM-dd'),
      hasAvailability: slots.some(s => s.available),
      slots,
    }
  })
}

// ── Admin helpers ─────────────────────────────────────────────

/** Returns appointment counts grouped by status for dashboard stats. */
export function groupByStatus(
  appointments: Appointment[]
): Record<Appointment['status'], number> {
  return appointments.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    },
    {} as Record<Appointment['status'], number>
  )
}

/** Formats a scheduled_at ISO string for display. */
export function formatAppointmentDate(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm")
}

/** Calculates the caution amount for a service. */
export function calcCautionAmount(price: number, cautionPct: number): number {
  return Math.round(price * (cautionPct / 100) * 100) / 100
}
