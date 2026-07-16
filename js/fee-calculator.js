/* ==========================================================================
   FEE-CALCULATOR.JS
   Pure functions — no DOM, no network — so they're trivially testable and
   reusable from the customer booking flow, the rider job preview, and the
   admin rate-card editor's live preview.

   Rate card shape (see js/seed.js for the 7 city defaults):
   {
     city, currency,
     base,          // flat price for 0–3 kg
     tier1PerKg,    // extra MMK per kg for the 3–5kg band
     tier2PerKg,    // extra MMK per kg for the 5–20kg band
     tier3PerKg,    // extra MMK per kg for the 20kg+ band
     perKmRate      // extra MMK per km travelled
   }
   ========================================================================== */

/** Haversine distance in kilometers between two {lat,lng} points. */
function calcDistanceKm(pointA, pointB) {
  if (!pointA || !pointB) return 0;
  const R = 6371;
  const dLat = ((pointB.lat - pointA.lat) * Math.PI) / 180;
  const dLng = ((pointB.lng - pointA.lng) * Math.PI) / 180;
  const lat1 = (pointA.lat * Math.PI) / 180;
  const lat2 = (pointB.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/** Weight-based tier breakdown, in words, for transparency in the UI. */
function weightBreakdown(weightKg, rateCard) {
  const steps = [];
  let remaining = weightKg;
  let cost = 0;

  // 0–3kg base
  const bandBase = Math.min(remaining, 3);
  steps.push({ label: "First 3 kg (base rate)", amount: rateCard.base });
  cost += rateCard.base;
  remaining -= bandBase;

  if (remaining > 0) {
    const band1 = Math.min(remaining, 2); // 3–5kg
    const amt1 = Math.round(band1 * rateCard.tier1PerKg);
    steps.push({ label: `3–5 kg (${band1.toFixed(1)} kg × ${rateCard.tier1PerKg})`, amount: amt1 });
    cost += amt1;
    remaining -= band1;
  }
  if (remaining > 0) {
    const band2 = Math.min(remaining, 15); // 5–20kg
    const amt2 = Math.round(band2 * rateCard.tier2PerKg);
    steps.push({ label: `5–20 kg (${band2.toFixed(1)} kg × ${rateCard.tier2PerKg})`, amount: amt2 });
    cost += amt2;
    remaining -= band2;
  }
  if (remaining > 0) {
    const band3 = remaining; // 20kg+
    const amt3 = Math.round(band3 * rateCard.tier3PerKg);
    steps.push({ label: `20+ kg (${band3.toFixed(1)} kg × ${rateCard.tier3PerKg})`, amount: amt3 });
    cost += amt3;
    remaining -= band3;
  }
  return { steps, weightCost: cost };
}

/**
 * Full fee quote used by the booking flow.
 * @returns {{ fee:number, distanceKm:number, weightCost:number, distanceCost:number,
 *             etaMinutes:number, breakdown:Array, currency:string }}
 */
function calculateDeliveryFee({ rateCard, weightKg, pickup, dropoff, parcelType }) {
  const distanceKm = calcDistanceKm(pickup, dropoff);
  const { steps, weightCost } = weightBreakdown(Math.max(weightKg, 0.1), rateCard);
  const distanceCost = Math.round(distanceKm * (rateCard.perKmRate || 0));

  const parcelSurcharge = { standard: 0, fragile: 500, food: 300, document: -200, electronics: 800 };
  const surcharge = parcelSurcharge[parcelType] ?? 0;

  const fee = Math.max(weightCost + distanceCost + surcharge, rateCard.base);

  // Simple ETA model: 6 min base handling + ~3 min/km, floored to nearest 5.
  const rawEta = 6 + distanceKm * 3;
  const etaMinutes = Math.max(15, Math.ceil(rawEta / 5) * 5);

  const breakdown = [
    ...steps,
    { label: `Distance (${distanceKm} km × ${rateCard.perKmRate || 0})`, amount: distanceCost },
    ...(surcharge !== 0 ? [{ label: "Parcel type adjustment", amount: surcharge }] : [])
  ];

  return {
    fee,
    distanceKm,
    weightCost,
    distanceCost,
    etaMinutes,
    breakdown,
    currency: rateCard.currency || "MMK"
  };
}

function formatCurrency(amount, currency = "MMK") {
  return `${Math.round(amount).toLocaleString("en-US")} ${currency}`;
}

window.FeeCalc = { calcDistanceKm, calculateDeliveryFee, formatCurrency };
