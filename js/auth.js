/* ==========================================================================
   AUTH.JS
   In production this wraps Firebase Authentication (createUserWithEmailAnd
   Password / signInWithEmailAndPassword). In demo mode it validates
   against the localStorage user table in store.js. The public functions
   below (Auth.register / Auth.login / Auth.logout) keep the same shape
   either way, so UI code never branches on mode.
   ========================================================================== */

const Auth = {
  async register({ role, name, email, password, phone, vehicle, plate }) {
    const existing = await window.Store.findUserByEmail(email);
    if (existing) throw new Error("An account with this email already exists.");
    if (!window.GO_FIREBASE.IS_DEMO_MODE) {
      // Live mode: create the Firebase Auth user, then mirror the profile
      // into Firestore via Store (swap in real firestoreMod calls here).
      const { authMod } = window.__firebase;
      await authMod.createUserWithEmailAndPassword(window.__firebase.auth, email, password);
    }
    const user = await window.Store.createUser({ role, name, email, password, phone, vehicle, plate });
    window.Store.setSession({ userId: user.id, role: user.role, name: user.name });
    return user;
  },

  async login({ email, password, expectedRole }) {
    if (!window.GO_FIREBASE.IS_DEMO_MODE) {
      const { authMod } = window.__firebase;
      await authMod.signInWithEmailAndPassword(window.__firebase.auth, email, password);
    }
    const user = await window.Store.findUserByEmail(email);
    if (!user || user.password !== password) throw new Error("Incorrect email or password.");
    if (expectedRole && user.role !== expectedRole) {
      throw new Error(`This account is registered as a ${user.role}, not a ${expectedRole}.`);
    }
    window.Store.setSession({ userId: user.id, role: user.role, name: user.name });
    return user;
  },

  logout() {
    window.Store.clearSession();
    location.href = "/index.html";
  }
};

window.Auth = Auth;
