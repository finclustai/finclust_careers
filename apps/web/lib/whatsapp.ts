/**
 * Opens a one-to-one WhatsApp chat with a candidate. This is a deep link the
 * recruiter clicks, not an API call: nothing is sent automatically and no
 * message leaves until they press send in WhatsApp themselves (ADR-0005).
 *
 * The prefill is deliberately just a greeting. A recruiter opens this to say
 * something specific, and a templated paragraph about their application is text
 * they have to delete first. Their own opening line is always better than ours.
 */
export function whatsappChatUrl(phone: string, candidateName?: string) {
  // wa.me wants digits only, no plus and no punctuation.
  const digits = phone.replace(/\D/g, "");

  const firstName = candidateName?.trim().split(/\s+/)[0];
  if (!firstName) return `https://wa.me/${digits}`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(`Hello ${firstName}`)}`;
}
