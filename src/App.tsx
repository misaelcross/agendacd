import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { ProposalView } from './pages/ProposalView'
import { supabase } from './lib/supabase'

const SETTINGS_ID = '550e8400-e29b-41d4-a716-446655440000'

function App() {
  const [systemName, setSystemName] = useState('Propostas CD')

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
            setSystemName(data.system_name)
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/proposal/:id" element={<ProposalView />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
