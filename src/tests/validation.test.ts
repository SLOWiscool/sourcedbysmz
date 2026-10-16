import { describe, it, expect } from 'vitest';
import { validateEmail, validateRequired, validatePostcode, validatePhone } from '../lib/validation';

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('test@example.com')).toBeNull();
  });

  it('rejects empty email', () => {
    expect(validateEmail('')).toBe('Email address is required.');
  });

  it('rejects email without @', () => {
    expect(validateEmail('testexample.com')).toBe('Enter a valid email address.');
  });

  it('rejects email without domain', () => {
    expect(validateEmail('test@')).toBe('Enter a valid email address.');
  });

  it('rejects email without TLD', () => {
    expect(validateEmail('test@example')).toBe('Enter a valid email address.');
  });

  it('rejects overly long email', () => {
    expect(validateEmail('a'.repeat(250) + '@test.com')).toBe('Email address is too long.');
  });
});

describe('validateRequired', () => {
  it('accepts non-empty value', () => {
    expect(validateRequired('hello', 'Field')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(validateRequired('', 'Field')).toBe('Field is required.');
  });

  it('rejects whitespace-only', () => {
    expect(validateRequired('   ', 'Name')).toBe('Name is required.');
  });
});

describe('validatePostcode', () => {
  it('accepts standard UK postcode', () => {
    expect(validatePostcode('SW1A 1AA')).toBeNull();
  });

  it('accepts postcode without space', () => {
    expect(validatePostcode('SW1A1AA')).toBeNull();
  });

  it('accepts lowercase postcode', () => {
    expect(validatePostcode('sw1a 1aa')).toBeNull();
  });

  it('rejects empty postcode', () => {
    expect(validatePostcode('')).toBe('Postcode is required.');
  });

  it('rejects invalid format', () => {
    expect(validatePostcode('12345')).toBe('Enter a valid UK postcode.');
  });
});

describe('validatePhone', () => {
  it('accepts valid UK phone', () => {
    expect(validatePhone('07123456789')).toBeNull();
  });

  it('accepts empty phone (optional)', () => {
    expect(validatePhone('')).toBeNull();
  });

  it('rejects too few digits', () => {
    expect(validatePhone('07123')).toBe('Enter a valid phone number.');
  });

  it('rejects too many digits', () => {
    expect(validatePhone('071234567890123456789')).toBe('Enter a valid phone number.');
  });
});
