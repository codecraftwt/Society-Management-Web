/**
 * Centralized validation utilities for the Society Management Web App.
 *
 * Every validator returns `null` when the value is valid, or a short,
 * user-friendly, field-specific error message. This keeps validation
 * consistent across every form in the app and mirrors the mobile app's
 * `src/utils/validators.js` behaviour and messages.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalize a text value: trim outer whitespace and collapse internal
 * runs of whitespace into a single space.
 */
export const sanitizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

/**
 * Check whether a value is empty (null, undefined, '', whitespace-only,
 * empty array, or empty object).
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Required-field check. Rejects empty and whitespace-only values.
 * @returns {string|null} error message or null
 */
export const getRequiredError = (value, label = 'This field') => {
  if (isEmpty(value)) return `${label} is required.`;
  return null;
};

/**
 * Generic title/name validation (4+ characters, not numbers-only,
 * not special-characters-only, no excessive whitespace).
 * Use for: titles, names, society names, bill titles, amenity names,
 * document titles, complaint titles, category names, visitor names, etc.
 */
export const getTitleError = (value, label = 'Title') => {
  if (isEmpty(value)) return `${label} is required.`;
  const v = value.trim();
  if (v.length < 4) return `${label} must contain at least 4 characters.`;
  if (/^\d+$/.test(v)) return `${label} cannot contain only numbers.`;
  if (/^[\W_]+$/.test(v)) return `${label} cannot contain only special characters.`;
  if (/\s{2,}/.test(v)) return `${label} should not contain excessive spaces.`;
  return null;
};

/**
 * Person-name validation (letters, spaces and common punctuation;
 * minimum 2 characters; no digits, no meaningful special characters).
 */
export const getNameError = (value, label = 'Name') => {
  if (isEmpty(value)) return `${label} is required.`;
  const v = value.trim();
  if (v.length < 2) return `${label} must be at least 2 characters.`;
  if (/\d/.test(v)) return `${label} cannot contain numbers.`;
  if (!/^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/.test(v)) {
    return `${label} should contain only letters and spaces.`;
  }
  if (/\s{2,}/.test(v)) return `${label} should not contain excessive spaces.`;
  return null;
};

/**
 * Email validation. Formats are validated loosely so legitimate addresses
 * are not rejected.
 */
export const getEmailError = (value, label = 'Email') => {
  if (isEmpty(value)) return `${label} is required.`;
  if (!EMAIL_REGEX.test(value.trim())) {
    return 'Please enter a valid email address.';
  }
  return null;
};

/**
 * Indian mobile number validation (exactly 10 digits, starting with 6-9).
 * Spaces are stripped before validation. Rejects alphabets, special
 * characters, short/long numbers and all-zero values.
 */
export const getMobileError = (value, label = 'Mobile number') => {
  if (isEmpty(value)) return `${label} is required.`;
  const digits = String(value).replace(/\s/g, '');
  if (!/^\d{10}$/.test(digits)) {
    return `${label} must be exactly 10 digits.`;
  }
  if (!INDIAN_MOBILE_REGEX.test(digits)) {
    return `${label} must start with a digit between 6 and 9.`;
  }
  return null;
};

/**
 * Generic numeric validation.
 * @param {*} value
 * @param {string} label
 * @param {object} options { min, max, allowDecimal, allowZero }
 */
export const getNumberError = (
  value,
  label = 'This field',
  { min = -Infinity, max = Infinity, allowZero = true, allowDecimal = true } = {}
) => {
  if (isEmpty(value)) return `${label} is required.`;
  const n = Number(value);
  if (value === null || value === undefined) return `${label} is required.`;
  if (!allowDecimal && Number.isInteger !== undefined && !Number.isInteger(n)) {
    return `${label} must be a whole number.`;
  }
  if (!Number.isFinite(n)) return `${label} must be a valid number.`;
  if (!allowZero && n === 0) return `${label} must be greater than 0.`;
  if (n < min) return `${label} must be at least ${min}.`;
  if (n > max) return `${label} must be at most ${max}.`;
  return null;
};

/**
 * Amount that must be a positive number (no negatives, no zero,
 * no meaningless values). Rejects alphabets and invalid special characters.
 */
export const getPositiveAmountError = (value, label = 'Amount') => {
  if (isEmpty(value)) return `${label} is required.`;
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} must be a valid number.`;
  if (n <= 0) return `${label} must be greater than 0.`;
  return null;
};

/**
 * Amount that must be a non-negative number (e.g. opening balance).
 */
export const getNonNegativeNumberError = (value, label = 'Amount') => {
  if (isEmpty(value)) return `${label} is required.`;
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} must be a valid number.`;
  if (n < 0) return `${label} cannot be negative.`;
  return null;
};

/**
 * Description / long-text validation.
 * @param {number} maxLength - optional maximum length
 */
export const getDescriptionError = (value, label = 'Description', maxLength = 1000) => {
  if (isEmpty(value)) return `${label} cannot be empty.`;
  const v = value.trim();
  if (v.length > maxLength) {
    return `${label} must be at most ${maxLength} characters.`;
  }
  return null;
};

const parseISODate = (value) => {
  if (typeof value !== 'string' || !value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(mo) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return date;
};

export const isValidDateString = (value) => parseISODate(value) !== null;

/**
 * Required date validation.
 */
export const getRequiredDateError = (value, label = 'Date') => {
  if (isEmpty(value)) return `${label} is required.`;
  if (!isValidDateString(value)) return `Please enter a valid ${label.toLowerCase()}.`;
  return null;
};

/**
 * Date-range validation. Returns an error when end is earlier than start.
 */
export const getDateRangeError = (
  start,
  end,
  startLabel = 'Start date',
  endLabel = 'End date'
) => {
  if (isEmpty(start) || isEmpty(end)) return null;
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  if (!startDate || !endDate) return null;
  if (endDate < startDate) {
    return `${endLabel} cannot be earlier than ${startLabel.toLowerCase()}.`;
  }
  return null;
};

/**
 * Future date validation (date must not be in the past).
 */
export const getNotPastDateError = (value, label = 'Date') => {
  if (isEmpty(value)) return null;
  const date = parseISODate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return `${label} cannot be in the past.`;
  return null;
};

/**
 * Vehicle number validation (Indian format; e.g. MH12AB1234).
 */
export const getVehicleNumberError = (value, label = 'Vehicle number') => {
  if (isEmpty(value)) return `${label} is required.`;
  const v = value.trim().toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(v)) {
    return `Please enter a valid Indian ${label.toLowerCase()}.`;
  }
  return null;
};

/**
 * Validate a whole form against a rules map.
 * @param {object} values - form values keyed by field name
 * @param {object} rules - field name -> validator function (or array)
 * @returns {object} field name -> error message (only for invalid fields)
 */
export const validateForm = (values, rules) => {
  const errors = {};
  Object.keys(rules).forEach((field) => {
    const rule = rules[field];
    const value = values[field];
    const checks = Array.isArray(rule) ? rule : [rule];
    for (const check of checks) {
      if (typeof check !== 'function') continue;
      const error = check(value);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });
  return errors;
};

export const hasErrors = (errors) =>
  Object.keys(errors).some(
    (key) => errors[key] !== null && errors[key] !== undefined && errors[key] !== ''
  );

export const validators = {
  sanitizeText,
  isEmpty,
  getRequiredError,
  getTitleError,
  getNameError,
  getEmailError,
  getMobileError,
  getNumberError,
  getPositiveAmountError,
  getNonNegativeNumberError,
  getDescriptionError,
  isValidDateString,
  getRequiredDateError,
  getDateRangeError,
  getNotPastDateError,
  getVehicleNumberError,
  validateForm,
  hasErrors,
};

export default validators;