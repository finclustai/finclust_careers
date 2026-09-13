/**
 * A Candidate is identified by phone number, so every spelling of the same
 * number must collapse to one value or the same person becomes several
 * Candidates. Returns null rather than guessing when the input is not a number
 * we can be confident about -- a junk Candidate row is worse than a rejected
 * form, because it is invisible until a recruiter calls the wrong person.
 *
 * India is the default country: a bare ten-digit mobile is assumed +91.
 * Anything written with an explicit country code keeps it.
 */
const DEFAULT_COUNTRY_CODE = "91";
// Indian mobile numbers start 6-9. A ten-digit string starting 0-5 is a
// landline or a typo, not a mobile we can send anything to.
const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const E164 = /^\+[1-9]\d{7,14}$/;

export function normalisePhone(raw: string): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  // Strip the punctuation people write numbers with, but nothing else: letters
  // surviving this step mean the input was never a phone number.
  const cleaned = trimmed.replace(/[\s()\-.]/g, "");
  if (!/^\+?\d+$/.test(cleaned)) return null;

  let digits: string;
  if (cleaned.startsWith("+")) {
    digits = cleaned.slice(1);
  } else if (cleaned.startsWith("00")) {
    digits = cleaned.slice(2);
  } else if (INDIAN_MOBILE.test(cleaned)) {
    digits = DEFAULT_COUNTRY_CODE + cleaned;
  } else if (cleaned.startsWith("0") && INDIAN_MOBILE.test(cleaned.slice(1))) {
    digits = DEFAULT_COUNTRY_CODE + cleaned.slice(1);
  } else if (cleaned.startsWith(DEFAULT_COUNTRY_CODE) && INDIAN_MOBILE.test(cleaned.slice(2))) {
    digits = cleaned;
  } else {
    return null;
  }

  const e164 = `+${digits}`;
  if (!E164.test(e164)) return null;
  // An Indian number that got this far must still be a real mobile.
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && !INDIAN_MOBILE.test(digits.slice(2))) return null;

  return e164;
}
