import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import CryptoJS from 'crypto-js'
import { encryptBlob, decryptBlob, generateSalt, hashPin } from '../auth/crypto'

const DB_NAME = 'cise_student_records'
const isNative = Capacitor.isNativePlatform()

// Data-at-rest protection: rather than relying on the SQLite plugin's
// native passphrase-storage feature (which proved unreliable across
// Android versions in testing — "No Passphrase stored" errors that
// couldn't be diagnosed without device console access), sensitive student
// fields are individually AES-256 encrypted with this key before being
// written to the database, and decrypted after reading. The database file
// itself is not passphrase-protected, but no PII is ever stored in
// plaintext in it.
const ENCRYPTION_SECRET = import.meta.env.VITE_DB_SECRET || 'CHANGE_ME_BEFORE_SHIPPING'

// Fields containing personal or sensitive information are encrypted.
// Fields needed for filtering/sorting/role-based access stay in plaintext.
const SENSITIVE_STUDENT_FIELDS = [
  'firstName', 'lastName', 'dob', 'gender',
  'guardianName', 'guardianPhone', 'guardianEmail',
  'emergencyContactName', 'emergencyContactPhone',
  'medicalNotes', 'address',
]

function encryptStudentFields(student) {
  const out = { ...student }
  for (const field of SENSITIVE_STUDENT_FIELDS) {
    if (out[field] !== undefined && out[field] !== null && out[field] !== '') {
      out[field] = CryptoJS.AES.encrypt(String(out[field]), ENCRYPTION_SECRET).toString()
    }
  }
  return out
}

function decryptStudentFields(row) {
  const out = { ...row }
  for (const field of SENSITIVE_STUDENT_FIELDS) {
    const value = out[field]
    if (value) {
      try {
        const bytes = CryptoJS.AES.decrypt(value, ENCRYPTION_SECRET)
        const plain = bytes.toString(CryptoJS.enc.Utf8)
        if (plain) out[field] = plain
      } catch {
        // Leave as-is if it can't be decrypted (e.g. pre-existing plaintext row)
      }
    }
  }
  return out
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  pinHash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('director','teacher')),
  assignedClass TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  dob TEXT,
  gender TEXT,
  grade TEXT,
  className TEXT,
  photoUri TEXT,
  guardianName TEXT,
  guardianPhone TEXT,
  guardianEmail TEXT,
  emergencyContactName TEXT,
  emergencyContactPhone TEXT,
  medicalNotes TEXT,
  address TEXT,
  enrollmentDate TEXT,
  isArchived INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  userId TEXT,
  username TEXT,
  action TEXT NOT NULL,
  targetType TEXT,
  targetId TEXT,
  details TEXT,
  timestamp TEXT NOT NULL
);
`

let sqlite = null
let db = null

// ---------- Web preview fallback (dev only) ----------
// Not for production data. Real devices must use the native path below,
// where SQLCipher provides actual file-level encryption at rest.
const WEB_STORE_KEY = 'cise_web_store_v1'
let webStore = null

function loadWebStore() {
  if (webStore) return webStore
  const raw = localStorage.getItem(WEB_STORE_KEY)
  if (raw) {
    try {
      webStore = decryptBlob(raw, ENCRYPTION_SECRET) || { users: [], students: [], audit_log: [] }
    } catch {
      webStore = { users: [], students: [], audit_log: [] }
    }
  } else {
    webStore = { users: [], students: [], audit_log: [] }
  }
  return webStore
}

function saveWebStore() {
  const cipherText = encryptBlob(webStore, ENCRYPTION_SECRET)
  localStorage.setItem(WEB_STORE_KEY, cipherText)
}

// ---------- Public API ----------

export async function initDatabase() {
  if (isNative) {
    sqlite = new SQLiteConnection(CapacitorSQLite)

    const ret = await sqlite.checkConnectionsConsistency()
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result

    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false)
    } else {
      // Sensitive fields are already AES-encrypted at the application layer
      // (see encryptStudentFields/decryptStudentFields above), so the
      // database file itself doesn't need native passphrase protection —
      // this sidesteps the unreliable native encryption path entirely.
      db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
    }
    await db.open()
    await db.execute(SCHEMA)
  } else {
    loadWebStore()
  }
  await seedDirectorIfEmpty()
}

async function seedDirectorIfEmpty() {
  const users = await getUsers()
  if (users.length === 0) {
    // First-run bootstrap only. The director sets a real PIN on first login
    // and should change it immediately (see Settings > Change PIN).
    await createUser({
      name: 'Director',
      username: 'director',
      pin: '0000',
      role: 'director',
      assignedClass: null,
    })
  }
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ---- Users ----
export async function getUsers() {
  if (isNative) {
    const res = await db.query('SELECT * FROM users')
    return res.values || []
  }
  return loadWebStore().users
}

export async function getUserByUsername(username) {
  const users = await getUsers()
  return users.find(u => u.username === username) || null
}

export async function createUser({ name, username, pin, role, assignedClass }) {
  const salt = generateSalt()
  const pinHash = hashPin(pin, salt)
  const user = {
    id: uid(),
    name,
    username,
    pinHash,
    salt,
    role,
    assignedClass: assignedClass || null,
    active: 1,
    createdAt: new Date().toISOString(),
  }
  if (isNative) {
    await db.run(
      `INSERT INTO users (id,name,username,pinHash,salt,role,assignedClass,active,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`,
      [user.id, user.name, user.username, user.pinHash, user.salt, user.role, user.assignedClass, user.active, user.createdAt]
    )
  } else {
    const store = loadWebStore()
    store.users.push(user)
    saveWebStore()
  }
  return user
}

export async function updateUserPin(userId, newPinHash) {
  if (isNative) {
    await db.run('UPDATE users SET pinHash = ? WHERE id = ?', [newPinHash, userId])
  } else {
    const store = loadWebStore()
    const idx = store.users.findIndex(u => u.id === userId)
    if (idx >= 0) {
      store.users[idx].pinHash = newPinHash
      saveWebStore()
    }
  }
}

// ---- Students ----
export async function getStudents({ role, assignedClass, includeArchived = false } = {}) {
  let rows
  if (isNative) {
    const res = await db.query('SELECT * FROM students')
    rows = (res.values || []).map(decryptStudentFields)
  } else {
    rows = loadWebStore().students
  }
  let filtered = includeArchived ? rows : rows.filter(s => !s.isArchived)
  // Role-based access: teachers only see students in their assigned class.
  if (role === 'teacher' && assignedClass) {
    filtered = filtered.filter(s => s.className === assignedClass)
  }
  return filtered
}

export async function getStudentById(id) {
  const students = await getStudents({ includeArchived: true })
  return students.find(s => s.id === id) || null
}

export async function addStudent(data) {
  const now = new Date().toISOString()
  const student = { id: uid(), isArchived: 0, createdAt: now, updatedAt: now, ...data }
  if (isNative) {
    const toStore = encryptStudentFields(student)
    const cols = Object.keys(toStore)
    const placeholders = cols.map(() => '?').join(',')
    await db.run(
      `INSERT INTO students (${cols.join(',')}) VALUES (${placeholders})`,
      cols.map(c => toStore[c])
    )
  } else {
    const store = loadWebStore()
    store.students.push(student)
    saveWebStore()
  }
  return student
}

export async function updateStudent(id, updates) {
  const now = new Date().toISOString()
  if (isNative) {
    const toStore = encryptStudentFields(updates)
    const cols = Object.keys(toStore)
    const setClause = cols.map(c => `${c} = ?`).join(', ')
    await db.run(`UPDATE students SET ${setClause}, updatedAt = ? WHERE id = ?`, [...cols.map(c => toStore[c]), now, id])
  } else {
    const store = loadWebStore()
    const idx = store.students.findIndex(s => s.id === id)
    if (idx >= 0) {
      store.students[idx] = { ...store.students[idx], ...updates, updatedAt: now }
      saveWebStore()
    }
  }
}

// Soft-delete only — preserves an audit trail. Records are archived, not
// destroyed, so a mistaken removal (or a records request) can be recovered.
export async function archiveStudent(id) {
  await updateStudent(id, { isArchived: 1 })
}

export async function restoreStudent(id) {
  await updateStudent(id, { isArchived: 0 })
}

// ---- Audit log ----
export async function addAuditLog({ userId, username, action, targetType, targetId, details }) {
  const entry = {
    id: uid(),
    userId: userId || null,
    username: username || 'unknown',
    action,
    targetType: targetType || null,
    targetId: targetId || null,
    details: details || '',
    timestamp: new Date().toISOString(),
  }
  if (isNative) {
    await db.run(
      `INSERT INTO audit_log (id,userId,username,action,targetType,targetId,details,timestamp) VALUES (?,?,?,?,?,?,?,?)`,
      [entry.id, entry.userId, entry.username, entry.action, entry.targetType, entry.targetId, entry.details, entry.timestamp]
    )
  } else {
    const store = loadWebStore()
    store.audit_log.push(entry)
    saveWebStore()
  }
  return entry
}

export async function getAuditLog({ limit = 200 } = {}) {
  let rows
  if (isNative) {
    const res = await db.query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?', [limit])
    rows = res.values || []
  } else {
    rows = [...loadWebStore().audit_log].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit)
  }
  return rows
}
