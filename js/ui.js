/* ==========================================================================
   UI.JS — shared helpers used across every screen
   ========================================================================== */

/* ---------- Theme ---------- */
function initTheme() {
  const saved = localStorage.getItem("gb_theme");
  const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("gb_theme", next);
}
initTheme();

/* ---------- Toasts ---------- */
function ensureToastWrap() {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  return wrap;
}
function showToast(message, type = "") {
  const wrap = ensureToastWrap();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px)";
    el.style.transition = "all .25s ease";
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

/* ---------- Bottom Sheet ---------- */
function openSheet(sheetEl, overlayEl) {
  overlayEl.classList.add("open");
  sheetEl.classList.add("open");
}
function closeSheet(sheetEl, overlayEl) {
  overlayEl.classList.remove("open");
  sheetEl.classList.remove("open");
}

/* ---------- Nav active state (based on filename) ---------- */
function markActiveNav() {
  const page = location.pathname.split("/").pop();
  document.querySelectorAll(".navlink[data-page]").forEach((link) => {
    if (link.dataset.page === page) link.classList.add("active");
  });
}

/* ---------- Avatar renderer (photo or initials) ---------- */
function renderAvatar(container, name, photoUrl, size = 44) {
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  if (photoUrl) {
    container.innerHTML = `<img src="${photoUrl}" class="avatar" style="width:100%;height:100%" alt="${name}">`;
  } else {
    const initials = (name || "?")
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    container.classList.add("avatar-fallback");
    container.style.fontSize = `${size * 0.38}px`;
    container.textContent = initials;
  }
}

/* ---------- Status badge helper ---------- */
const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Accepted",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled"
};
const STATUS_CLASS = {
  pending: "badge-pending",
  accepted: "badge-accepted",
  picked_up: "badge-pickedup",
  in_transit: "badge-transit",
  delivered: "badge-delivered",
  cancelled: "badge-cancelled"
};
function statusBadgeHtml(status) {
  return `<span class="badge ${STATUS_CLASS[status] || ""}">${STATUS_LABEL[status] || status}</span>`;
}

/* ---------- Relative time ---------- */
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ---------- Simple client-side route guard ----------
   Redirects to the landing page when there's no valid session for this
   role. Throwing after kicking off the redirect halts the rest of the
   calling <script> block synchronously, so page-init code below the
   requireAuth() call never runs against a null session while the
   navigation is in flight. */
function requireAuth(role) {
  const session = window.Store.getSession();
  if (!session || (role && session.role !== role)) {
    const depth = location.pathname.split("/").filter(Boolean).length > 1 ? "../" : "";
    location.href = `${depth}index.html`;
    throw new Error("Not authenticated — redirecting to login.");
  }
  return session;
}

window.UI = {
  toggleTheme,
  showToast,
  openSheet,
  closeSheet,
  markActiveNav,
  renderAvatar,
  statusBadgeHtml,
  timeAgo,
  requireAuth,
  STATUS_LABEL
};
