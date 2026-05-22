# Revanew — App Store & Play Store Publishing Guide

Generated: May 22, 2026 | Powered by PLEX Automation

---

## ✅ What's Already Live (test TODAY)

Your app is already a **full Progressive Web App (PWA)**.
Open https://revanew.io on your phone and:

### Android (Chrome):
1. Open the URL in Chrome
2. Tap the **three dots menu** (top right)
3. Tap **"Add to Home screen"**
4. Tap **"Add"**
5. The app installs with the Revanew icon — opens full-screen, no browser bar

### iPhone (Safari):
1. Open the URL in **Safari** (must be Safari, not Chrome on iOS)
2. Tap the **Share button** ⎙ at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"**
5. Opens full-screen with Revanew icon on your home screen

---

## 🚀 Google Play Store (Android) — ~1 week

Google accepts PWAs as real Play Store apps via **Trusted Web Activity (TWA)**.

### Requirements:
- Google Play Developer account: **$25 one-time fee**
  → https://play.google.com/console/signup
- A domain you control (revanew.io or custom domain)
- Custom domain strongly recommended: e.g. **app.revanew.io**

### Steps:

**Step 1 — Get a custom domain (recommended)**
- Buy revanew.io or app.revanew.io from Namecheap or Cloudflare (~$12/yr)
- Point it to your Railway app

**Step 2 — Use PWABuilder to generate the Android app**
1. Go to https://www.pwabuilder.com
2. Enter your app URL
3. Click "Build My PWA"
4. Click "Android" → "Generate Package"
5. Downloads a ZIP with an Android APK + AAB file

**Step 3 — Get your SHA-256 certificate fingerprint**
After downloading, PWABuilder shows your signing key SHA-256.
Update public/assetlinks.json with your real fingerprint:
```
PLACEHOLDER_REPLACE_WITH_YOUR_SHA256_CERT → your actual SHA256
```
Also update the package_name from `io.plexautomation.revanew` to whatever you choose.

**Step 4 — Upload to Play Console**
1. Create new app at https://play.google.com/console
2. Upload the AAB file
3. Fill in store listing (description, screenshots, category: Business)
4. Submit for review (~3-7 days)

**Cost:** $25 one-time + domain (~$12/yr)
**Timeline:** 1-2 hours setup + 3-7 days review

---

## 🍎 Apple App Store (iOS) — ~2-3 weeks

Apple requires more work. Two options:

### Option A — PWABuilder iOS Wrapper (~1 week)
1. Apple Developer account: **$99/year**
   → https://developer.apple.com/programs/
2. Go to https://www.pwabuilder.com → iOS → Generate Package
3. Opens Xcode project (Mac required)
4. Build & upload via Xcode or Transporter
5. Submit via App Store Connect

**Requires:** Mac computer (or Mac cloud service like MacStadium)

### Option B — Capacitor Native Wrapper (more native, ~2-3 weeks)
More features (push notifications, camera, biometrics, deep links):
```bash
npm install @capacitor/core @capacitor/ios @capacitor/android
npx cap init Revanew io.plexautomation.revanew
npx cap add ios
npx cap add android
npx cap sync
```
Then open in Xcode / Android Studio for final submission.

---

## 📱 What Your PWA Already Supports

- ✅ Add to Home Screen (Android + iOS)
- ✅ Full-screen standalone mode (no browser bar)
- ✅ Custom app icon (all sizes generated)
- ✅ Splash screen colors (#0B1220 background, #2563EB theme)
- ✅ App shortcuts (New Quote, Dashboard from long-press)
- ✅ Offline support (cached assets serve when offline)
- ✅ Push notifications infrastructure (service worker ready)
- ✅ Background sync (queues actions when offline)
- ✅ Install prompt banner (shows in-app on Android)
- ✅ iOS Add to Home Screen instructions (shows after 30s)

---

## 🔔 Push Notifications (future)

To send push notifications (invoice reminders, quote accepted alerts):
1. Get VAPID keys: `npx web-push generate-vapid-keys`
2. Add to Railway: `VAPID_PUBLIC_KEY=...` and `VAPID_PRIVATE_KEY=...`
3. Push endpoint: POST /api/push/subscribe (already scaffolded)

---

## 📊 App Store Listing Content (ready to use)

**App name:** Revanew
**Subtitle:** Quotes. Invoices. Get Paid.
**Category:** Business / Finance
**Description:**
Revanew is the complete billing platform for service businesses. Send
professional quotes in under 60 seconds, collect e-signatures, accept
deposits, and get paid faster with AI-powered payment reminders.

**Keywords:** quote builder, invoice app, payment collection, contractor
billing, service business, estimate, proposal, e-signature

**Screenshots needed:** (take on your phone after installing)
- Dashboard overview
- New quote screen  
- Quote portal (client view)
- Invoice with Mark Paid
- Automations screen
