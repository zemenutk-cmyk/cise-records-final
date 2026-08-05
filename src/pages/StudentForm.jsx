import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getStudentById, addStudent, updateStudent, addAuditLog } from '../db/database'
import { useAuth } from '../auth/AuthContext'

const emptyForm = {
  firstName: '', lastName: '', dob: '', gender: '', grade: '', className: '',
  guardianName: '', guardianPhone: '', guardianEmail: '',
  emergencyContactName: '', emergencyContactPhone: '',
  medicalNotes: '', address: '', enrollmentDate: '',
}

export default function StudentForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (isEdit) {
      getStudentById(id).then(s => {
        if (s) setForm(s)
        setLoading(false)
      })
    }
  }, [id])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isEdit) {
      await updateStudent(id, form)
      await addAuditLog({
        userId: user.id, username: user.username, action: 'UPDATE',
        targetType: 'student', targetId: id,
        details: `Updated record for ${form.firstName} ${form.lastName}`,
      })
    } else {
      const created = await addStudent(form)
      await addAuditLog({
        userId: user.id, username: user.username, action: 'CREATE',
        targetType: 'student', targetId: created.id,
        details: `Created record for ${form.firstName} ${form.lastName}`,
      })
    }
    navigate('/students')
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border p-5">
      <Section title="Student information">
        <Field label="First name" required value={form.firstName} onChange={v => set('firstName', v)} />
        <Field label="Last name" required value={form.lastName} onChange={v => set('lastName', v)} />
        <Field label="Date of birth" type="date" value={form.dob} onChange={v => set('dob', v)} />
        <Field label="Gender" value={form.gender} onChange={v => set('gender', v)} />
        <Field label="Grade" required value={form.grade} onChange={v => set('grade', v)} />
        <Field label="Class" required value={form.className} onChange={v => set('className', v)} />
        <Field label="Enrollment date" type="date" value={form.enrollmentDate} onChange={v => set('enrollmentDate', v)} />
      </Section>

      <Section title="Guardian contact">
        <Field label="Guardian name" value={form.guardianName} onChange={v => set('guardianName', v)} />
        <Field label="Guardian phone" value={form.guardianPhone} onChange={v => set('guardianPhone', v)} />
        <Field label="Guardian email" type="email" value={form.guardianEmail} onChange={v => set('guardianEmail', v)} />
        <Field label="Home address" value={form.address} onChange={v => set('address', v)} />
      </Section>

      <Section title="Emergency contact">
        <Field label="Contact name" value={form.emergencyContactName} onChange={v => set('emergencyContactName', v)} />
        <Field label="Contact phone" value={form.emergencyContactPhone} onChange={v => set('emergencyContactPhone', v)} />
      </Section>

      <Section title="Medical notes">
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cise-red"
          rows={3}
          placeholder="Allergies, conditions, medication — visible to director & class teacher only"
          value={form.medicalNotes}
          onChange={e => set('medicalNotes', e.target.value)}
        />
      </Section>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">
          Cancel
        </button>
        <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-cise-red text-white hover:bg-cise-red-dark">
          {isEdit ? 'Save changes' : 'Add student'}
        </button>
      </div>
    </form>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-cise-red border-b border-cise-red/30 pb-1 mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="text-xs font-medium text-gray-500">
      {label}{required && <span className="text-cise-red"> *</span>}
      <input
        type={type}
        required={required}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm text-cise-charcoal focus:outline-none focus:ring-2 focus:ring-cise-red"
      />
    </label>
  )
}
