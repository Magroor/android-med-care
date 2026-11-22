/**
 * Privacy helpers aligned with the WhatsApp Business Messaging Policy:
 * "Don't share or ask people to share full length payment card numbers, financial account numbers,
 * personal ID card numbers, or other sensitive identifiers."
 * Anything that looks like a national ID (CNIC) or card number is removed BEFORE it is stored or processed.
 */

function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// Pakistani CNIC: 12345-1234567-1 (dashes optional). Also catches 13 digits written with spaces.
const CNIC_RE = /(?<!\d)\d{5}[- ]?\d{7}[- ]?\d(?!\d)/g;
// 15-19 digits (13-14 are skipped: CNIC / 00-prefixed phone numbers), optionally grouped by spaces/dashes (payment cards)
const CARD_RE = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g; // e.g. PK36SCBL0000001123456702

export type Redaction = { text: string; redacted: boolean };

export function redactSensitive(input: string): Redaction {
  let redacted = false;
  let out = input.replace(IBAN_RE, (m) => {
    if (/^[A-Z]{2}\d{2}/.test(m) && m.length >= 15) {
      redacted = true;
      return "[account number removed]";
    }
    return m;
  });
  out = out.replace(CARD_RE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 15 && digits.length <= 19 && luhn(digits)) {
      redacted = true;
      return "[card number removed]";
    }
    return m;
  });
  out = out.replace(CNIC_RE, () => {
    redacted = true;
    return "[ID number removed]";
  });
  return { text: out, redacted };
}
