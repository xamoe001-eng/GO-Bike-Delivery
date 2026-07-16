/* ==========================================================================
   SEED.JS — populates demo data once so the app is explorable immediately.
   Safe to delete in production: real accounts come from Firebase Auth and
   an admin fills in real rate cards from the Admin > Delivery Rates screen.
   ========================================================================== */

(async function seed() {
  const cards = await window.Store.listRateCards();
  if (cards.length === 0) {
    const CITY_RATES = [
      { city: "Yangon", base: 2000, tier1PerKg: 400, tier2PerKg: 350, tier3PerKg: 300, perKmRate: 150, currency: "MMK" },
      { city: "Mandalay", base: 1800, tier1PerKg: 380, tier2PerKg: 330, tier3PerKg: 280, perKmRate: 140, currency: "MMK" },
      { city: "Naypyidaw", base: 1900, tier1PerKg: 380, tier2PerKg: 320, tier3PerKg: 280, perKmRate: 140, currency: "MMK" },
      { city: "Bago", base: 1600, tier1PerKg: 340, tier2PerKg: 300, tier3PerKg: 260, perKmRate: 130, currency: "MMK" },
      { city: "Mawlamyine", base: 1600, tier1PerKg: 340, tier2PerKg: 300, tier3PerKg: 260, perKmRate: 130, currency: "MMK" },
      { city: "Pyay", base: 1500, tier1PerKg: 320, tier2PerKg: 280, tier3PerKg: 250, perKmRate: 120, currency: "MMK" },
      { city: "Magway", base: 1500, tier1PerKg: 320, tier2PerKg: 280, tier3PerKg: 250, perKmRate: 120, currency: "MMK" }
    ];
    for (const c of CITY_RATES) await window.Store.saveRateCard(c);
  }

  const customers = await window.Store.listUsersByRole("customer");
  let demoCustomer;
  if (customers.length === 0) {
    demoCustomer = await window.Store.createUser({
      role: "customer",
      name: "Thiri Aung",
      email: "customer@demo.com",
      password: "demo1234",
      phone: "09-123-456-78",
      photoUrl: ""
    });
  } else {
    demoCustomer = customers[0];
  }

  const riders = await window.Store.listUsersByRole("rider");
  let demoRider;
  if (riders.length === 0) {
    demoRider = await window.Store.createUser({
      role: "rider",
      name: "Ko Zaw Lin",
      email: "rider@demo.com",
      password: "demo1234",
      phone: "09-987-654-32",
      vehicle: "Honda Wave 110",
      plate: "YGN-4471"
    });
    await window.Store.createUser({
      role: "rider",
      name: "Ma Su Su",
      email: "rider2@demo.com",
      password: "demo1234",
      phone: "09-555-222-11",
      vehicle: "Yamaha Fino",
      plate: "MDY-1183"
    });
  } else {
    demoRider = riders[0];
  }

  const admins = await window.Store.listUsersByRole("admin");
  if (admins.length === 0) {
    await window.Store.createUser({
      role: "admin",
      name: "Admin",
      email: "admin@demo.com",
      password: "demo1234",
      phone: "09-000-000-00"
    });
  }

  const orders = await window.Store.listAllOrders();
  if (orders.length === 0) {
    const rate = await window.Store.getRateCard("Yangon");
    const samples = [
      {
        customerId: demoCustomer.id,
        city: "Yangon",
        parcelType: "standard",
        weightKg: 2,
        pickup: { lat: 16.8409, lng: 96.1735, address: "Sule Pagoda Rd, Yangon" },
        dropoff: { lat: 16.8661, lng: 96.1951, address: "Junction City, Yangon" },
        note: "Handle with care, glass items"
      },
      {
        customerId: demoCustomer.id,
        city: "Yangon",
        parcelType: "food",
        weightKg: 1.2,
        pickup: { lat: 16.8195, lng: 96.1444, address: "Hledan Centre, Yangon" },
        dropoff: { lat: 16.8028, lng: 96.1517, address: "University Ave, Yangon" },
        note: "Lunch order — deliver hot"
      },
      {
        customerId: demoCustomer.id,
        city: "Yangon",
        parcelType: "electronics",
        weightKg: 4.5,
        pickup: { lat: 16.8731, lng: 96.1951, address: "Myaynigone, Sanchaung" },
        dropoff: { lat: 16.7967, lng: 96.1610, address: "Thanlyin Bridge Rd" },
        note: "Laptop — fragile"
      }
    ];
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const quote = window.FeeCalc.calculateDeliveryFee({ rateCard: rate, weightKg: s.weightKg, pickup: s.pickup, dropoff: s.dropoff, parcelType: s.parcelType });
      const order = await window.Store.createOrder({
        ...s,
        distanceKm: quote.distanceKm,
        fee: quote.fee,
        etaMinutes: quote.etaMinutes
      });
      // vary statuses for a livelier demo history
      if (i === 1) {
        await window.Store.assignRiderToOrder(order.id, demoRider.id);
        await window.Store.updateOrderStatus(order.id, "picked_up");
        await window.Store.updateOrderStatus(order.id, "in_transit");
        await window.Store.updateOrderStatus(order.id, "delivered");
        await window.Store.creditRiderEarnings(demoRider.id, quote.fee);
      }
      if (i === 2) {
        await window.Store.assignRiderToOrder(order.id, demoRider.id);
        await window.Store.updateOrderStatus(order.id, "picked_up");
      }
    }
  }
})();
