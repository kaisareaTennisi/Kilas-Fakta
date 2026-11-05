import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from '../store/slices/authSlice'

/**
 * Pelindung rute: tanpa token, pengguna dialihkan ke /login.
 */
export default function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}
