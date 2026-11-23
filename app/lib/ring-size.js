// US <-> Thai ring sizes, shared by the custom-order form, the API validation,
// the emails and the admin view.
//
// Source: Thai jewellers size rings by whole-number inner circumference in mm
// (the ISO 8653 / "EU" number, e.g. Thai 54 = EU 54), and US sizes follow the
// standard inner-diameter scale d(mm) = 11.63 + 0.8128 * size
// (see International Gem Society, "Ring Size Comparison Chart"). The table is
// that scale rounded to the nearest whole millimetre, so a conversion is an
// approximation to within half a US size; the form says so. Confirm the shop's
// own Thai sizing convention before treating this as a sizing authority.
//
// The database stores the US size only (ring_size numeric, 5 to 16, half steps),
// so a Thai entry is converted to US before it is saved.

export const RING_SIZE_SYSTEMS = ["us", "th"];
export const US_MIN = 5;
export const US_MAX = 16;

const US_DIAMETER_BASE = 11.63;
const US_DIAMETER_STEP = 0.8128;

function usToCircumference(us) {
  return Math.PI * (US_DIAMETER_BASE + US_DIAMETER_STEP * us);
}

// [US size, Thai size] for every half size from 5 to 16.
export const RING_SIZE_TABLE = Array.from({ length: (US_MAX - US_MIN) * 2 + 1 }, (_, index) => {
  const us = US_MIN + index / 2;
  return [us, Math.round(usToCircumference(us))];
});

export const THAI_MIN = RING_SIZE_TABLE[0][1];
export const THAI_MAX = RING_SIZE_TABLE[RING_SIZE_TABLE.length - 1][1];

export function isValidUsSize(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= US_MIN && number <= US_MAX && Number.isInteger(number * 2);
}

export function isValidThaiSize(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= THAI_MIN && number <= THAI_MAX;
}

export function usToThai(us) {
  const row = RING_SIZE_TABLE.find(([size]) => size === Number(us));
  return row ? row[1] : null;
}

// Nearest US half size for a whole-number Thai size, or null when out of range.
export function thaiToUs(thai) {
  if (!isValidThaiSize(thai)) {
    return null;
  }

  const diameter = Number(thai) / Math.PI;
  const exact = (diameter - US_DIAMETER_BASE) / US_DIAMETER_STEP;
  const half = Math.round(exact * 2) / 2;
  return Math.min(US_MAX, Math.max(US_MIN, half));
}

// "US 7 (Thai 54)" for a stored US size; entered = "th" leads with Thai.
export function formatRingSize(us, entered = "us") {
  const thai = usToThai(us);

  if (thai === null) {
    return us === null || us === undefined || us === "" ? "" : `US ${us}`;
  }

  return entered === "th" ? `Thai ${thai} (US ${us})` : `US ${us} (Thai ${thai})`;
}
