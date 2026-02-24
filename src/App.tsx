import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { ProposalView } from './pages/ProposalView'
import { Login } from './pages/Login'
import { ResetPassword } from './pages/ResetPassword'
import { UpdatePassword } from './pages/UpdatePassword'
import { ContractForm } from './pages/ContractForm'
import { ContractSign } from './pages/ContractSign'
import { supabase } from './lib/supabase'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

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
          // Apply System Name
          if (data.system_name) {
            document.title = data.system_name
          }

          // Apply Favicon
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
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />

          {/* A tela de visualizar a proposta pelo Cliente não requer login do Admin */}
          <Route path="/proposta/:id" element={<ProposalView />} />
          <Route path="/proposta/:proposalId/contratar" element={<ContractForm />} />
          <Route path="/proposta/:contractId/assinar" element={<ContractSign />} />

          {/* Rotas Protegidas (Apenas Admin logado) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
