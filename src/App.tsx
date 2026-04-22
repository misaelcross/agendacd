import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Existing pages
import { Dashboard }       from './pages/Dashboard'
import { ProposalView }    from './pages/ProposalView'
import { Login }           from './pages/Login'
import { ResetPassword }   from './pages/ResetPassword'
import { UpdatePassword }  from './pages/UpdatePassword'
import { ContractForm }    from './pages/ContractForm'
import { ContractSign }    from './pages/ContractSign'

// Admin — appointments
import { AppointmentsCalendar }  from './pages/admin/AppointmentsCalendar'
import { AppointmentsList }      from './pages/admin/AppointmentsList'
import { AppointmentDetail }     from './pages/admin/AppointmentDetail'
import { ServicesConfig }        from './pages/admin/ServicesConfig'
import { StaffConfig }           from './pages/admin/StaffConfig'
import { AppointmentsReports }   from './pages/admin/AppointmentsReports'

// Booking flow (public)
import { BookingLayout }         from './pages/booking/BookingLayout'
import { BookingServices }       from './pages/booking/BookingServices'
import { BookingServiceDetail }  from './pages/booking/BookingServiceDetail'
import { BookingStaffSelect }    from './pages/booking/BookingStaffSelect'
import { BookingDateTime }       from './pages/booking/BookingDateTime'
import { BookingClientInfo }     from './pages/booking/BookingClientInfo'
import { BookingConfirm }        from './pages/booking/BookingConfirm'
import { BookingPayment }        from './pages/booking/BookingPayment'

// Layout & auth
import { AdminShell }      from './components/layout/AdminShell'
import { supabase }        from './lib/supabase'
import { AuthProvider }    from './contexts/AuthContext'
import { ProtectedRoute }  from './components/ProtectedRoute'

const SETTINGS_ID = '550e8400-e29b-41d4-a716-446655440000'

function App() {
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('system_name, favicon_url')
          .eq('id', SETTINGS_ID)
          .single()

        if (data && !error) {
          if (data.system_name) document.title = data.system_name

          if (data.favicon_url) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
            if (!link) {
              link = document.createElement('link')
              link.rel = 'icon'
              document.getElementsByTagName('head')[0].appendChild(link)
            }
            link.href = data.favicon_url
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err)
      }
    }

    loadSettings()
  }, [])

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public: auth ── */}
          <Route path="/login"           element={<Login />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />

          {/* ── Public: proposal / contract client flow ── */}
          <Route path="/proposta/:id"                  element={<ProposalView />} />
          <Route path="/proposta/:proposalId/contratar" element={<ContractForm />} />
          <Route path="/proposta/:contractId/assinar"   element={<ContractSign />} />

          {/* ── Public: booking wizard ── */}
          <Route path="/agendar" element={<BookingLayout />}>
            <Route index                     element={<BookingServices />} />
            <Route path="servico/:serviceId" element={<BookingServiceDetail />} />
            <Route path="profissional"       element={<BookingStaffSelect />} />
            <Route path="horario"            element={<BookingDateTime />} />
            <Route path="dados"              element={<BookingClientInfo />} />
            <Route path="confirmar"          element={<BookingConfirm />} />
            <Route path="pagamento"          element={<BookingPayment />} />
          </Route>

          {/* ── Protected: admin — proposals (existing dashboard) ── */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminShell>
                  <Dashboard />
                </AdminShell>
              </ProtectedRoute>
            }
          />

          {/* ── Protected: admin — appointments ── */}
          <Route
            path="/agenda"
            element={
              <ProtectedRoute>
                <AdminShell>
                  <AppointmentsCalendar />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agenda/lista"
            element={
              <ProtectedRoute>
                <AdminShell>
                  <AppointmentsList />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agenda/:id"
            element={
              <ProtectedRoute>
                <AdminShell>
                  <AppointmentDetail />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/servicos"
            element={
              <ProtectedRoute>
                <AdminShell>
                  <ServicesConfig />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/equipe"
            element={
              <ProtectedRoute>
                <AdminShell>
                  <StaffConfig />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/relatorios"
            element={
              <ProtectedRoute>
                <AdminShell>
                  <AppointmentsReports />
                </AdminShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
