import CryptoJS from 'crypto-js'

// PIN/password hashing (PBKDF2 with per-user salt). Plaintext PINs are
// never stored or logged anywhere in this app.
const ITERATIONS = 10000

export function generateSalt() {
  return CryptoJS.lib.WordArray.random(16).toString()
}

export function hashPin(pin, salt) {
  return CryptoJS.PBKDF2(pin, salt, { keySize: 256 / 32, iterations: ITERATIONS }).toString()
}

export function verifyPin(pin, salt, expectedHash) {
  const hash = hashPin(pin, salt)
  return timingSafeEqual(hash, expectedHash)
}

// Basic constant-time string compare to reduce timing side-channels on PIN checks.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// Symmetric encryption for the web-preview data store only.
// On Android, real data-at-rest encryption is handled by SQLCipher via
// @capacitor-community/sqlite (see db/database.js), which is the layer
// that matters for actual devices in the field.
export function encryptBlob(plainObj, key) {
  return CryptoJS.AES.encrypt(JSON.stringify(plainObj), key).toString()
}

export function decryptBlob(cipherText, key) {
  const bytes = CryptoJS.AES.decrypt(cipherText, key)
  const json = bytes.toString(CryptoJS.enc.Utf8)
  return json ? JSON.parse(json) : null
}
