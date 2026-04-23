import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Existing pages
import { SignUp }          from './pages/SignUp'
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
import { AuthProvider }    from './contexts/AuthContext'
import { ProtectedRoute }  from './components/ProtectedRoute'
import { AdminBusinessProvider } from './contexts/BusinessContext'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public: auth ── */}
          <Route path="/login"           element={<Login />} />
          <Route path="/cadastro"        element={<SignUp />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />

          {/* ── Public: proposal / contract client flow ── */}
          <Route path="/proposta/:id"                  element={<ProposalView />} />
          <Route path="/proposta/:proposalId/contratar" element={<ContractForm />} />
          <Route path="/proposta/:contractId/assinar"   element={<ContractSign />} />

          {/* ── Public: booking wizard (multi-tenant via slug) ── */}
          <Route path="/agendar/:slug" element={<BookingLayout />}>
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
                <AdminBusinessProvider>
                  <AdminShell>
                    <Dashboard />
                  </AdminShell>
                </AdminBusinessProvider>
              </ProtectedRoute>
            }
          />

          {/* ── Protected: admin — appointments ── */}
          <Route
            path="/agenda"
            element={
              <ProtectedRoute>
                <AdminBusinessProvider>
                  <AdminShell>
                    <AppointmentsCalendar />
                  </AdminShell>
                </AdminBusinessProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agenda/lista"
            element={
              <ProtectedRoute>
                <AdminBusinessProvider>
                  <AdminShell>
                    <AppointmentsList />
                  </AdminShell>
                </AdminBusinessProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agenda/:id"
            element={
              <ProtectedRoute>
                <AdminBusinessProvider>
                  <AdminShell>
                    <AppointmentDetail />
                  </AdminShell>
                </AdminBusinessProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/servicos"
            element={
              <ProtectedRoute>
                <AdminBusinessProvider>
                  <AdminShell>
                    <ServicesConfig />
                  </AdminShell>
                </AdminBusinessProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/equipe"
            element={
              <ProtectedRoute>
                <AdminBusinessProvider>
                  <AdminShell>
                    <StaffConfig />
                  </AdminShell>
                </AdminBusinessProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/relatorios"
            element={
              <ProtectedRoute>
                <AdminBusinessProvider>
                  <AdminShell>
                    <AppointmentsReports />
                  </AdminShell>
                </AdminBusinessProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
