import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface Business {
  id: string
  name: string
  slug: string
}

interface BusinessContextType {
  business: Business | null
  businessId: string | null
  loading: boolean
}

const BusinessContext = createContext<BusinessContextType>({
  business: null,
  businessId: null,
  loading: true,
})

/** Admin provider — resolves business by the logged-in user's owner_id */
export function AdminBusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setBusiness(null)
      setLoading(false)
      return
    }

    supabase
      .from('businesses')
      .select('id, name, slug')
      .eq('owner_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setBusiness(data as Business)
        setLoading(false)
      })
  }, [user])

  return (
    <BusinessContext.Provider value={{ business, businessId: business?.id ?? null, loading }}>
      {children}
    </BusinessContext.Provider>
  )
}

/** Booking provider — resolves business by slug from the URL */
export function BookingBusinessProvider({
  slug,
  children,
}: {
  slug: string | undefined
  children: ReactNode
}) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) {
      setBusiness(null)
      setLoading(false)
      return
    }

    supabase
      .from('businesses')
      .select('id, name, slug')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setBusiness(data as Business)
        setLoading(false)
      })
  }, [slug])

  return (
    <BusinessContext.Provider value={{ business, businessId: business?.id ?? null, loading }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness(): BusinessContextType {
  return useContext(BusinessContext)
}
