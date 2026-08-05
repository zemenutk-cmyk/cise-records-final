import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Users, ClipboardList, Settings as SettingsIcon, LogOut, GraduationCap } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const navItem = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-cise-red text-white' : 'text-cise-charcoal hover:bg-red-50'
    }`

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-cise-red text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <GraduationCap size={22} />
          <span className="font-bold text-sm">CISE Student Records</span>
        </div>
        <div className="text-right text-xs">
          <div className="font-semibold">{user?.name}</div>
          <div className="opacity-80 capitalize">{user?.role}</div>
        </div>
      </header>

      <nav className="bg-white border-b px-2 py-2 flex gap-1 overflow-x-auto">
        <NavLink to="/students" className={navItem}>
          <Users size={16} /> Students
        </NavLink>
        {user?.role === 'director' && (
          <NavLink to="/audit-log" className={navItem}>
            <ClipboardList size={16} /> Audit Log
          </NavLink>
        )}
        <NavLink to="/settings" className={navItem}>
          <SettingsIcon size={16} /> Settings
        </NavLink>
        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 ml-auto">
          <LogOut size={16} /> Sign out
        </button>
      </nav>

      <main className="flex-1 p-4 max-w-3xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
