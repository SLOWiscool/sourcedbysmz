export interface FieldError {
  field: string;
  message: string;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email address is required.';
  if (trimmed.length > 254) return 'Email address is too long.';
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(trimmed)) return 'Enter a valid email address.';
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) return `${fieldName} is required.`;
  return null;
}

export function validatePostcode(postcode: string): string | null {
  const trimmed = postcode.trim().toUpperCase();
  if (!trimmed) return 'Postcode is required.';
  const postcodeRe = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/;
  if (!postcodeRe.test(trimmed)) return 'Enter a valid UK postcode.';
  return null;
}

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return 'Enter a valid phone number.';
  return null;
}
