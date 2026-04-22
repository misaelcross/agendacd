import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { BookingState, BookingAction } from '../types/appointments'

const INITIAL_STATE: BookingState = {
  service: null,
  staff: null,
  date: null,
  time: null,
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  clientNotes: '',
  appointmentId: null,
}

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_SERVICE':
      // Changing service resets staff, date, and time
      return { ...state, service: action.payload, staff: null, date: null, time: null }
    case 'SET_STAFF':
      // Changing staff resets date and time
      return { ...state, staff: action.payload, date: null, time: null }
    case 'SET_DATE':
      return { ...state, date: action.payload, time: null }
    case 'SET_TIME':
      return { ...state, time: action.payload }
    case 'SET_CLIENT_INFO':
      return { ...state, ...action.payload }
    case 'SET_APPOINTMENT_ID':
      return { ...state, appointmentId: action.payload }
    case 'RESET':
      return INITIAL_STATE
    default:
      return state
  }
}

interface BookingContextValue {
  state: BookingState
  dispatch: React.Dispatch<BookingAction>
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, INITIAL_STATE)
  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used inside <BookingProvider>')
  return ctx
}
