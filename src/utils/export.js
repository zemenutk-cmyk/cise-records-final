// Lightweight CSV export — avoids pulling in a heavy library for a simple need.
export function exportStudentsToCSV(students) {
  const columns = [
    'firstName', 'lastName', 'dob', 'gender', 'grade', 'className',
    'guardianName', 'guardianPhone', 'guardianEmail',
    'emergencyContactName', 'emergencyContactPhone',
    'address', 'enrollmentDate',
  ]
  const header = columns.join(',')
  const rows = students.map(s =>
    columns.map(c => escapeCSV(s[c] ?? '')).join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cise-students-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function escapeCSV(value) {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
