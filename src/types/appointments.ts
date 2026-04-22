// ── Domain types for the Appointments module ──────────────────

export type ServiceCategory = 'facial' | 'massagem' | 'corporal' | 'outro'

export interface Service {
  id: string
  name: string
  description: string | null
  emoji: string
  category: ServiceCategory
  duration_min: number
  price: number
  caution_pct: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Staff {
  id: string
  name: string
  role: string | null
  initials: string | null
  avatar_color: string
  is_active: boolean
  sort_order: number
  created_at: string
  // Joined relations (optional, loaded on demand)
  staff_services?: StaffService[]
  staff_availability?: StaffAvailability[]
}

export interface StaffService {
  staff_id: string
  service_id: string
}

/** day_of_week: 0 = Sunday … 6 = Saturday */
export interface StaffAvailability {
  id: string
  staff_id: string
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6
  start_time: string   // "HH:MM:SS"
  end_time: string     // "HH:MM:SS"
  is_active: boolean
}

export interface BlockedSlot {
  id: string
  staff_id: string
  blocked_at: string      // ISO 8601
  blocked_until: string   // ISO 8601
  reason: string | null
  created_at: string
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type CautionStatus     = 'none' | 'pending' | 'paid' | 'refunded'

export interface Appointment {
  id: string
  service_id: string | null
  staff_id: string | null
  client_name: string
  client_email: string
  client_phone: string | null
  scheduled_at: string   // ISO 8601
  ends_at: string        // ISO 8601
  status: AppointmentStatus
  service_price: number
  caution_amount: number
  caution_status: CautionStatus
  caution_paid_at: string | null
  client_notes: string | null
  admin_notes: string | null
  policy_accepted: boolean
  created_at: string
  cancelled_at: string | null
  // Joined relations (optional)
  services?: Service | null
  staff?: Staff | null
}

// ── Booking wizard state ───────────────────────────────────────

export interface BookingState {
  service: Service | null
  staff: Staff | null        // null = "no preference"
  date: string | null        // "YYYY-MM-DD"
  time: string | null        // "HH:MM"
  clientName: string
  clientEmail: string
  clientPhone: string
  clientNotes: string
  appointmentId: string | null   // set after successful book_appointment RPC
}

export type BookingAction =
  | { type: 'SET_SERVICE';    payload: Service }
  | { type: 'SET_STAFF';      payload: Staff | null }
  | { type: 'SET_DATE';       payload: string }
  | { type: 'SET_TIME';       payload: string }
  | { type: 'SET_CLIENT_INFO'; payload: Partial<Pick<BookingState, 'clientName' | 'clientEmail' | 'clientPhone' | 'clientNotes'>> }
  | { type: 'SET_APPOINTMENT_ID'; payload: string }
  | { type: 'RESET' }

// ── Time slot helpers ──────────────────────────────────────────

export type SlotPeriod = 'manha' | 'tarde' | 'noite'

export interface TimeSlot {
  time: string       // "HH:MM"
  period: SlotPeriod
  available: boolean
}

export interface DaySlots {
  date: string         // "YYYY-MM-DD"
  hasAvailability: boolean
  slots: TimeSlot[]
}

// ── Admin list filters ─────────────────────────────────────────

export interface AppointmentFilters {
  status?: AppointmentStatus | 'all'
  staffId?: string | null
  serviceId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  search?: string
}
