/**
 * E.164 Phone Number Validation and Formatting Utility
 * Standard E.164 format: +[country code][number] (e.g. +15559990001, +447911123456)
 */

export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleaned = phone.trim().replace(/[\s\(\)\-]/g, '');
  // Basic E.164 format check: starts with +, followed by 7 to 15 digits
  return /^\+[1-9]\d{6,14}$/.test(cleaned);
}

export function formatToE164(phone: string | null | undefined, defaultCountryCode = '+1'): string | null {
  if (!phone) return null;
  let cleaned = phone.trim().replace(/[\s\(\)\-]/g, '');

  if (!cleaned) return null;

  // Add leading + if missing but starts with country code digits
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = `${defaultCountryCode}${cleaned}`;
    } else {
      cleaned = `+${cleaned}`;
    }
  }

  return isValidPhoneNumber(cleaned) ? cleaned : null;
}
