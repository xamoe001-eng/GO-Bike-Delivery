/* ==========================================================================
   STORE.JS
   Single data-access layer used by every screen. In production (Firebase
   configured) each function talks to Cloud Firestore. In demo mode it
   reads/writes the exact same shape of data to localStorage, so every
   other file in the app (customer.js, rider.js, admin.js) never needs to
   know which mode it's in.
   ========================================================================== */

const LS_KEYS = {
  users: "gb_users",
  riders: "gb_riders",
  orders: "gb_orders",
  rateCards: "gb_rate_cards",
  notifications: "gb_notifications",
  session: "gb_session"
};

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const Store = {
  /* ---------------- Session ---------------- */
  getSession() {
    return lsGet(LS_KEYS.session, null);
  },
  setSession(sessionObj) {
    lsSet(LS_KEYS.session, sessionObj);
  },
  clearSession() {
    localStorage.removeItem(LS_KEYS.session);
  },

  /* ---------------- Users ---------------- */
  async getUser(userId) {
    const users = lsGet(LS_KEYS.users, []);
    return users.find((u) => u.id === userId) || null;
  },
  async findUserByEmail(email) {
    const users = lsGet(LS_KEYS.users, []);
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  async createUser(user) {
    const users = lsGet(LS_KEYS.users, []);
    const newUser = { id: uid("usr"), createdAt: Date.now(), ...user };
    users.push(newUser);
    lsSet(LS_KEYS.users, users);
    if (newUser.role === "rider") {
      const riders = lsGet(LS_KEYS.riders, []);
      riders.push({
        id: newUser.id,
        status: "offline",
        todayEarnings: 0,
        weekEarnings: 0,
        totalDeliveries: 0,
        rating: 5.0,
        vehicle: user.vehicle || "Motorbike"
      });
      lsSet(LS_KEYS.riders, riders);
    }
    return newUser;
  },
  async updateUser(userId, patch) {
    const users = lsGet(LS_KEYS.users, []);
    const idx = users.findIndex((u) => u.id === userId);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...patch };
      lsSet(LS_KEYS.users, users);
      return users[idx];
    }
    return null;
  },
  async listUsersByRole(role) {
    const users = lsGet(LS_KEYS.users, []);
    return users.filter((u) => u.role === role);
  },

  /* ---------------- Riders (status + earnings) ---------------- */
  async getRiderMeta(riderId) {
    const riders = lsGet(LS_KEYS.riders, []);
    return riders.find((r) => r.id === riderId) || null;
  },
  async setRiderStatus(riderId, status) {
    const riders = lsGet(LS_KEYS.riders, []);
    const idx = riders.findIndex((r) => r.id === riderId);
    if (idx > -1) {
      riders[idx].status = status;
      lsSet(LS_KEYS.riders, riders);
      return riders[idx];
    }
    return null;
  },
  async creditRiderEarnings(riderId, amount) {
    const riders = lsGet(LS_KEYS.riders, []);
    const idx = riders.findIndex((r) => r.id === riderId);
    if (idx > -1) {
      riders[idx].todayEarnings += amount;
      riders[idx].weekEarnings += amount;
      riders[idx].totalDeliveries += 1;
      lsSet(LS_KEYS.riders, riders);
      return riders[idx];
    }
    return null;
  },
  async listRiders() {
    const riders = lsGet(LS_KEYS.riders, []);
    const users = lsGet(LS_KEYS.users, []);
    return riders.map((r) => ({ ...r, ...users.find((u) => u.id === r.id) }));
  },

  /* ---------------- Rate Cards ---------------- */
  async getRateCard(city) {
    const cards = lsGet(LS_KEYS.rateCards, []);
    return cards.find((c) => c.city === city) || null;
  },
  async listRateCards() {
    return lsGet(LS_KEYS.rateCards, []);
  },
  async saveRateCard(card) {
    const cards = lsGet(LS_KEYS.rateCards, []);
    const idx = cards.findIndex((c) => c.city === card.city);
    if (idx > -1) cards[idx] = { ...cards[idx], ...card };
    else cards.push(card);
    lsSet(LS_KEYS.rateCards, cards);
    return card;
  },

  /* ---------------- Orders ---------------- */
  async createOrder(order) {
    const orders = lsGet(LS_KEYS.orders, []);
    const newOrder = {
      id: uid("ord"),
      status: "pending",
      riderId: null,
      createdAt: Date.now(),
      timeline: [{ status: "pending", at: Date.now() }],
      ...order
    };
    orders.unshift(newOrder);
    lsSet(LS_KEYS.orders, orders);
    await Store.pushNotification({
      userId: order.customerId,
      title: "Order placed",
      body: `Your order ${newOrder.id.toUpperCase()} is waiting for a rider.`
    });
    return newOrder;
  },
  async getOrder(orderId) {
    const orders = lsGet(LS_KEYS.orders, []);
    return orders.find((o) => o.id === orderId) || null;
  },
  async listOrdersByCustomer(customerId) {
    const orders = lsGet(LS_KEYS.orders, []);
    return orders.filter((o) => o.customerId === customerId);
  },
  async listOrdersByRider(riderId) {
    const orders = lsGet(LS_KEYS.orders, []);
    return orders.filter((o) => o.riderId === riderId);
  },
  async listAvailableOrders() {
    const orders = lsGet(LS_KEYS.orders, []);
    return orders.filter((o) => o.status === "pending");
  },
  async listAllOrders() {
    return lsGet(LS_KEYS.orders, []);
  },
  async updateOrderStatus(orderId, status, extra = {}) {
    const orders = lsGet(LS_KEYS.orders, []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;
    orders[idx].status = status;
    orders[idx].timeline.push({ status, at: Date.now() });
    Object.assign(orders[idx], extra);
    lsSet(LS_KEYS.orders, orders);

    const o = orders[idx];
    const statusCopy = {
      accepted: "A rider has accepted your order.",
      picked_up: "Your parcel has been picked up.",
      in_transit: "Your parcel is on the way.",
      delivered: "Your parcel has been delivered. Thank you!",
      cancelled: "Your order was cancelled."
    };
    if (statusCopy[status]) {
      await Store.pushNotification({
        userId: o.customerId,
        title: `Order ${status.replace("_", " ")}`,
        body: statusCopy[status]
      });
    }
    return o;
  },
  async assignRiderToOrder(orderId, riderId) {
    return Store.updateOrderStatus(orderId, "accepted", { riderId, acceptedAt: Date.now() });
  },

  /* ---------------- Notifications ---------------- */
  async pushNotification(notif) {
    const list = lsGet(LS_KEYS.notifications, []);
    list.unshift({ id: uid("ntf"), read: false, createdAt: Date.now(), ...notif });
    lsSet(LS_KEYS.notifications, list);
  },
  async listNotifications(userId) {
    const list = lsGet(LS_KEYS.notifications, []);
    return list.filter((n) => n.userId === userId);
  },
  async markAllNotificationsRead(userId) {
    const list = lsGet(LS_KEYS.notifications, []);
    list.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
    lsSet(LS_KEYS.notifications, list);
  },

  /* ---------------- Aggregates (for dashboards) ---------------- */
  async getAdminStats() {
    const orders = lsGet(LS_KEYS.orders, []);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => o.createdAt >= todayStart.getTime());
    const completed = orders.filter((o) => o.status === "delivered");
    const pending = orders.filter((o) => ["pending", "accepted", "picked_up", "in_transit"].includes(o.status));
    const revenue = completed.reduce((sum, o) => sum + (o.fee || 0), 0);
    return {
      todayOrders: todayOrders.length,
      completedOrders: completed.length,
      pendingOrders: pending.length,
      revenue,
      latestOrders: orders.slice(0, 6)
    };
  }
};

window.Store = Store;
