import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-off flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-green-600 animate-spin" />
            </div>
        )
    }

    if (!user) {
        // Redireciona para o login se não estiver autenticado
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}
