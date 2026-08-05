import { useEffect, useState } from 'react'
import { getAuditLog } from '../db/database'
import { ClipboardList } from 'lucide-react'

const ACTION_COLORS = {
  LOGIN_SUCCESS: 'text-green-600',
  LOGIN_FAILED: 'text-red-600',
  LOGOUT: 'text-gray-500',
  CREATE: 'text-blue-600',
  UPDATE: 'text-amber-600',
  VIEW: 'text-gray-400',
  ARCHIVE: 'text-red-600',
  EXPORT: 'text-purple-600',
}

export default function AuditLog() {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    getAuditLog({ limit: 300 }).then(setEntries)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cise-charcoal">
        <ClipboardList size={18} />
        <h2 className="font-bold">Audit Log</h2>
      </div>
      <p className="text-xs text-gray-500">
        Every login, view, edit, archive, and export is recorded here for safeguarding accountability.
      </p>
      <div className="bg-white rounded-xl border divide-y">
        {entries.map(e => (
          <div key={e.id} className="p-3 text-sm flex justify-between gap-2">
            <div>
              <span className={`font-semibold ${ACTION_COLORS[e.action] || 'text-cise-charcoal'}`}>{e.action}</span>
              <span className="text-gray-500"> by {e.username}</span>
              {e.details && <p className="text-xs text-gray-400 mt-0.5">{e.details}</p>}
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(e.timestamp).toLocaleString()}
            </span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No activity yet.</p>}
      </div>
    </div>
  )
}
