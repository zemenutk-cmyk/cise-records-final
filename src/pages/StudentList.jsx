import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStudents, addAuditLog } from '../db/database'
import { useAuth } from '../auth/AuthContext'
import { Search, UserPlus, Phone } from 'lucide-react'
import { exportStudentsToCSV } from '../utils/export'

export default function StudentList() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const data = await getStudents({ role: user.role, assignedClass: user.assignedClass })
    setStudents(data)
    setLoading(false)
  }

  const filtered = students.filter(s => {
    const q = query.toLowerCase()
    return (
      s.firstName?.toLowerCase().includes(q) ||
      s.lastName?.toLowerCase().includes(q) ||
      s.className?.toLowerCase().includes(q) ||
      s.grade?.toLowerCase().includes(q)
    )
  })

  async function handleExport() {
    await addAuditLog({
      userId: user.id,
      username: user.username,
      action: 'EXPORT',
      targetType: 'students',
      details: `Exported ${filtered.length} student record(s) to CSV`,
    })
    exportStudentsToCSV(filtered)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            className="w-full border rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cise-red"
            placeholder="Search by name, class, or grade…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <Link
          to="/students/new"
          className="flex items-center gap-1 bg-cise-red text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-cise-red-dark"
        >
          <UserPlus size={16} /> Add
        </Link>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
        <button onClick={handleExport} className="underline">Export CSV</button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map(s => (
            <li key={s.id}>
              <Link
                to={`/students/${s.id}`}
                className="block bg-white rounded-lg shadow-sm border p-3 hover:border-cise-red transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-cise-charcoal">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-gray-500">Grade {s.grade} · {s.className}</p>
                  </div>
                  {s.guardianPhone && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Phone size={12} /> {s.guardianPhone}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No students found.</p>
          )}
        </ul>
      )}
    </div>
  )
}
