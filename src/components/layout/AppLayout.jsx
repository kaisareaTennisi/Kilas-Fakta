import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

/**
 * Kerangka halaman utama: Navbar di atas, konten di tengah, Footer di bawah.
 */
export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
