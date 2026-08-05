# CISE Student Records

Android app for the Primary Division Director to securely manage student
records and guardian/emergency contact information.

**App ID:** `et.cise.studentrecords`
**Stack:** React + Vite + Tailwind CSS + Capacitor, SQLite with
application-layer AES-256 field encryption, role-based access, audit log.

## What's included

- PIN-based login with per-user salted hash (PBKDF2) — no plaintext PINs
  stored anywhere
- Two roles: **Director** (full access, manages teacher accounts, sees audit
  log) and **Teacher** (only sees students in their assigned class)
- Student records: name, DOB, gender, grade/class, guardian contact,
  emergency contact, medical notes, address
- Search and CSV export
- Soft-delete only ("Archive") — nothing is destructively deleted
- Full audit log: every login, failed login, view, create, edit, archive,
  and export is timestamped and attributed to a user
- Auto-lock after 3 minutes of inactivity, requiring the PIN to resume
- Basic brute-force protection: 5 failed attempts triggers a 60s lockout
- **Data protection:** sensitive student fields (name, DOB, guardian and
  emergency contact info, medical notes) are individually AES-256 encrypted
  before being written to the on-device SQLite database, and only
  decrypted in memory when displayed. This was chosen over the SQLite
  plugin's native whole-database encryption, which proved unreliable across
  Android versions during testing.

## Before you ship (important)

1. **Set a real encryption secret** as a GitHub repository secret named
   `VITE_DB_SECRET` (Settings → Secrets and variables → Actions). This key
   protects all the sensitive fields listed above — treat it like a
   password, and don't lose it (a lost key means old encrypted data can't
   be read back if you ever rebuild with a different one).
2. **Change the default director PIN** (`director` / `0000`) the first time
   you log in, under Settings > Change PIN.
3. Decide a **data retention policy** (how long to keep records after a
   student leaves) — archiving is built in, but purging old archives is a
   policy decision, not a technical one.
4. This is single-device local storage only — if multiple devices need to
   share data, that would need a sync layer added later.

## Getting the APK — no laptop needed

This project builds itself in the cloud via GitHub Actions. Every step
below works from a tablet browser.

1. **Create a GitHub account** at github.com if you don't have one.
2. **Create a new repository** (New → name it, e.g. `cise-student-records`
   → Create). If you're redoing this after an earlier attempt, use a fresh
   repository name to avoid any leftover files causing confusion.
3. **Add your encryption secret**: repo → Settings → Secrets and variables
   → Actions → New repository secret → name it `VITE_DB_SECRET` → paste in
   a long random value → Add secret.
4. **Open a Codespace**: on the repo's main page, green **Code** button →
   **Codespaces** tab → **Create codespace on main**. Wait ~30 seconds.
5. **Upload this project**: in the Codespace file panel, right-click →
   **Upload...** → select this zip file.
6. **Unzip and push** — open the Terminal tab at the bottom and run these
   one at a time:
   ```
   unzip -o cise-student-records-source.zip
   shopt -s dotglob
   mv cise-student-records/* .
   rmdir cise-student-records
   git add -A
   git commit -m "Add project"
   git push
   ```
7. **Watch the build**: go to the **Actions** tab of your repo. A build
   starts automatically and takes 3-5 minutes.
8. **Download the APK**: once it shows a green checkmark, click into the
   run, scroll to **Artifacts**, download `cise-student-records-apk`, and
   unzip it to get `app-debug.apk`.
9. **Install on your tablet**: open the APK file, allow "install from
   unknown sources" if prompted, install.
10. **Log in**: username `director`, PIN `0000` — then go straight to
    Settings and change the PIN.

Note: this builds a **debug APK**, meant for internal school use. It's not
signed for the Play Store, which is fine for an internal tool.

## Local development (optional, for testing in a browser first)

```bash
npm install
npm run dev
```

Runs in the browser using an encrypted local-storage fallback so you can
test the UI without a device. Default login: `director` / `0000`.

## Project structure

```
src/
  auth/          PIN hashing, session/auth context (login, lock, logout)
  db/            SQLite (native) + encrypted fallback (web), schema, CRUD,
                 field-level AES encryption for sensitive columns
  pages/         Login, Lock screen, Student list/form/detail, Audit log, Settings
  components/    App shell/navigation
  utils/         CSV export
.github/
  workflows/     Automated cloud APK build (GitHub Actions)
```

## Troubleshooting

- **Build fails with a TypeScript error** — your repo likely has leftover
  files from a different project mixed in. Start with a fresh repository.
- **"No such file or directory: .github/workflows"** — the zip wasn't
  unpacked with hidden folders included; make sure you ran
  `shopt -s dotglob` before the `mv` command.
- **App won't open, database error on launch** — uninstall the app
  completely from the tablet (not just reinstall over it) before installing
  a new build, especially after any code update.
