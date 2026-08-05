import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getStudentById, archiveStudent, addAuditLog } from '../db/database'
import { useAuth } from '../auth/AuthContext'
import { Pencil, Archive, ArrowLeft } from 'lucide-react'

export default function StudentDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)

  useEffect(() => {
    getStudentById(id).then(async s => {
      setStudent(s)
      if (s) {
        await addAuditLog({
          userId: user.id, username: user.username, action: 'VIEW',
          targetType: 'student', targetId: id,
          details: `Viewed record for ${s.firstName} ${s.lastName}`,
        })
      }
    })
  }, [id])

  async function handleArchive() {
    if (!confirm(`Archive ${student.firstName} ${student.lastName}? This can be undone by the director.`)) return
    await archiveStudent(id)
    await addAuditLog({
      userId: user.id, username: user.username, action: 'ARCHIVE',
      targetType: 'student', targetId: id,
      details: `Archived record for ${student.firstName} ${student.lastName}`,
    })
    navigate('/students')
  }

  if (!student) return <p className="text-gray-400 text-sm">Loading…</p>

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-cise-charcoal">{student.firstName} {student.lastName}</h2>
            <p className="text-sm text-gray-500">Grade {student.grade} · {student.className}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/students/${id}/edit`} className="p-2 rounded-lg bg-red-50 text-cise-red hover:bg-red-100">
              <Pencil size={16} />
            </Link>
            {user.role === 'director' && (
              <button onClick={handleArchive} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
                <Archive size={16} />
              </button>
            )}
          </div>
        </div>

        <Row label="Date of birth" value={student.dob} />
        <Row label="Gender" value={student.gender} />
        <Row label="Enrollment date" value={student.enrollmentDate} />

        <h3 className="text-sm font-bold text-cise-red border-b border-cise-red/30 pb-1">Guardian contact</h3>
        <Row label="Name" value={student.guardianName} />
        <Row label="Phone" value={student.guardianPhone} />
        <Row label="Email" value={student.guardianEmail} />
        <Row label="Address" value={student.address} />

        <h3 className="text-sm font-bold text-cise-red border-b border-cise-red/30 pb-1">Emergency contact</h3>
        <Row label="Name" value={student.emergencyContactName} />
        <Row label="Phone" value={student.emergencyContactPhone} />

        {student.medicalNotes && (
          <>
            <h3 className="text-sm font-bold text-cise-red border-b border-cise-red/30 pb-1">Medical notes</h3>
            <p className="text-sm text-cise-charcoal">{student.medicalNotes}</p>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-cise-charcoal font-medium">{value}</span>
    </div>
  )
}
