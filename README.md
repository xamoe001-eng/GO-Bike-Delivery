# GO Bike Delivery

A mobile-first delivery platform (Customer / Rider / Admin) built with plain
HTML5, CSS3, and vanilla JavaScript — installable as a PWA, backed by
Firebase Authentication, Cloud Firestore, and Firebase Storage.

The app runs in **demo mode** out of the box (no Firebase project required):
all data lives in `localStorage` behind the exact same function signatures
the Firestore version would use, so you can click through every screen
immediately, and swap in real Firebase later without touching UI code.

## Try it now

1. Open `index.html` in a browser (or serve the folder with any static
   server — service workers require `http://localhost` or `https://`).
2. Tap a role card (Customer / Rider / Admin). Demo credentials are
   pre-filled — just tap **Log In**.
   - Customer: `customer@demo.com` / `demo1234`
   - Rider: `rider@demo.com` / `demo1234`
   - Admin: `admin@demo.com` / `demo1234`

## Folder structure

```
/
├── index.html              Landing page + role selector + login/register
├── manifest.json            PWA manifest
├── service-worker.js        Offline app-shell caching
├── firebase.json            Firebase Hosting config (optional)
├── firestore.rules          Example production security rules
├── css/
│   └── style.css            Full design system (tokens, components)
├── js/
│   ├── firebase.js          Firebase SDK bootstrap + demo-mode switch
│   ├── store.js             Data layer (Firestore-shaped, localStorage in demo)
│   ├── fee-calculator.js    Distance + weight-tier fee engine
│   ├── ui.js                Toasts, theme, nav, avatars, badges
│   ├── auth.js               Register / login / logout
│   └── seed.js               Demo data seeding (rate cards, sample accounts)
├── customer/
│   ├── dashboard.html        Home — stats + recent orders
│   ├── create-order.html     Booking flow — OSM map, parcel, live fare
│   ├── track-order.html      Order detail — timeline, map, rider contact
│   ├── order-history.html    Filterable order history
│   ├── notifications.html    Notification feed
│   └── profile.html          Account + dark mode + logout
├── rider/
│   ├── dashboard.html        Online/offline toggle, today stats
│   ├── orders.html           Available / Active / History tabs
│   ├── earnings.html         Daily/weekly earnings + 7-day chart
│   └── profile.html          Account + vehicle info
├── admin/
│   ├── dashboard.html        Today's orders, revenue, latest orders
│   ├── orders.html           Order management + cancel
│   ├── riders.html           Rider roster + status + performance
│   ├── rates.html            Delivery rate card editor (per city)
│   ├── more.html             Hub: customers / reports / settings
│   ├── customers.html        Customer management
│   ├── reports.html          Revenue + parcel + city statistics
│   └── settings.html         Platform settings
└── assets/icons/             PWA icons (72–512px)
```

## Going live with Firebase

1. Create a project at the [Firebase console](https://console.firebase.google.com).
2. Enable **Authentication → Email/Password**, **Cloud Firestore**, and
   **Storage**.
3. Paste your web app config into `FIREBASE_CONFIG` in `js/firebase.js`.
   The app automatically leaves demo mode the moment `apiKey` is filled in.
4. Deploy `firestore.rules` (`firebase deploy --only firestore:rules`) —
   see the data model comment block at the bottom of `js/firebase.js`.
5. In `js/store.js`, replace each `localStorage` implementation with the
   equivalent Firestore call (`getDoc`, `setDoc`, `addDoc`, `onSnapshot`,
   etc.) — the function names and return shapes are already what the rest
   of the app expects, so no other file needs to change.
6. Deploy static hosting: `firebase deploy --only hosting`.

## Notes

- Maps use **Leaflet + OpenStreetMap** tiles (no API key needed) for pickup
  and drop-off pin selection. There is intentionally no live GPS tracking —
  only static pickup/drop-off pins, per spec.
- Riders open **Google Maps navigation** in a new tab once they accept an
  order (`rider/orders.html` → "Open Google Maps Navigation").
- The delivery fee engine (`js/fee-calculator.js`) combines a per-city rate
  card (base + 3 weight tiers + per-km rate) with parcel-type surcharges —
  fully editable from **Admin → Delivery Rates** with a live preview.
