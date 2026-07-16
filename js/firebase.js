/* ==========================================================================
   FIREBASE.JS
   Central Firebase bootstrap for GO Bike Delivery.

   HOW TO GO LIVE:
   1. Create a project at https://console.firebase.google.com
   2. Enable Authentication > Email/Password (and Phone, if desired)
   3. Enable Cloud Firestore (start in production mode + deploy the rules
      you ship with this project)
   4. Enable Storage (for profile photos / parcel photos)
   5. Paste your web app config into FIREBASE_CONFIG below.

   Until FIREBASE_CONFIG is filled in, the app automatically runs in
   DEMO MODE: js/store.js swaps every Firestore call for an equivalent
   localStorage-backed implementation so the UI is fully explorable
   without a backend. Nothing else in the codebase needs to change when
   you go live — store.js exposes the exact same function signatures.
   ========================================================================== */

// TODO: replace with your real Firebase project config
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Demo mode is active whenever the config above hasn't been filled in.
const IS_DEMO_MODE = FIREBASE_CONFIG.apiKey === "YOUR_API_KEY";

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;

/**
 * Lazily loads the Firebase modular SDK from the CDN and initializes
 * Auth / Firestore / Storage. Only runs when NOT in demo mode, so the
 * app never pays the network cost while you're building the UI.
 */
async function initFirebase() {
  if (IS_DEMO_MODE) {
    console.info(
      "%cGO Bike Delivery — running in DEMO MODE (no Firebase config found). " +
        "All data is stored locally in this browser. Fill in FIREBASE_CONFIG in js/firebase.js to go live.",
      "color:#E8610A;font-weight:bold;"
    );
    return { demo: true };
  }

  const { initializeApp } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
  );
  const authMod = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
  );
  const firestoreMod = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
  );
  const storageMod = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"
  );

  firebaseApp = initializeApp(FIREBASE_CONFIG);
  firebaseAuth = authMod.getAuth(firebaseApp);
  firebaseDb = firestoreMod.getFirestore(firebaseApp);
  firebaseStorage = storageMod.getStorage(firebaseApp);

  window.__firebase = {
    app: firebaseApp,
    auth: firebaseAuth,
    db: firebaseDb,
    storage: firebaseStorage,
    authMod,
    firestoreMod,
    storageMod
  };

  return { demo: false };
}

window.GO_FIREBASE = { initFirebase, IS_DEMO_MODE, FIREBASE_CONFIG };

/* ==========================================================================
   SUGGESTED FIRESTORE DATA MODEL (for when you connect a real project)

   /users/{uid}
     role: "customer" | "rider" | "admin"
     name, phone, email, photoUrl, createdAt

   /riders/{uid}
     status: "online" | "offline"
     todayEarnings, weekEarnings, totalDeliveries, rating

   /orders/{orderId}
     customerId, riderId (nullable)
     status: "pending"|"accepted"|"picked_up"|"in_transit"|"delivered"|"cancelled"
     city, parcelType, weightKg
     pickup: { lat, lng, address }
     dropoff: { lat, lng, address }
     distanceKm, fee, etaMinutes
     createdAt, acceptedAt, pickedUpAt, deliveredAt

   /rateCards/{city}
     base: number            // 0–3kg flat price
     tier1PerKg: number      // 3–5kg extra per kg
     tier2PerKg: number      // 5–20kg extra per kg
     tier3PerKg: number      // 20kg+ extra per kg
     perKmRate: number       // optional distance component
     currency: "MMK"

   /notifications/{id}
     userId, title, body, read, createdAt
   ========================================================================== */
