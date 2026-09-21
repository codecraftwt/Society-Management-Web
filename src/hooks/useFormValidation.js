import { useState, useCallback, useMemo } from 'react';
import { validateForm, hasErrors } from '../utils/validators';

/**
 * Reusable React Hook for Form Validation & Unsaved Changes Tracking.
 *
 * @param {object} initialValues - Initial form field values
 * @param {object} rules - Mapping of field name -> validator function(s)
 * @param {function} onSubmit - Optional submit callback receiving (validatedPayload)
 */
export function useFormValidation(initialValues = {}, rules = {}, onSubmit = null) {
  const [values, setValues] = useState(initialValues);
  const [initial, setInitial] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if form has unsaved changes compared to initialValues
  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(values).some((key) => {
      const initVal = initial[key] ?? '';
      const currVal = values[key] ?? '';
      return JSON.stringify(initVal) !== JSON.stringify(currVal);
    });
  }, [values, initial]);

  // Validate a single field
  const validateField = useCallback(
    (name, val) => {
      if (!rules[name]) return null;
      const checks = Array.isArray(rules[name]) ? rules[name] : [rules[name]];
      for (const check of checks) {
        if (typeof check === 'function') {
          const err = check(val);
          if (err) return err;
        }
      }
      return null;
    },
    [rules]
  );

  // Update field value + run live validation if touched or has existing error
  const handleChange = useCallback(
    (name, value) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        if (touched[name] || errors[name]) {
          const err = validateField(name, value);
          setErrors((prevErrs) => ({ ...prevErrs, [name]: err }));
        }
        return next;
      });
    },
    [touched, errors, validateField]
  );

  // Handle input blur (marks field as touched and runs validation)
  const handleBlur = useCallback(
    (name) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const err = validateField(name, values[name]);
      setErrors((prevErrs) => ({ ...prevErrs, [name]: err }));
    },
    [validateField, values]
  );

  // Validate all fields (Level 1)
  const validateAll = useCallback(() => {
    const allTouched = Object.keys(rules).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    const newErrors = validateForm(values, rules);
    setErrors(newErrors);
    return !hasErrors(newErrors);
  }, [values, rules]);

  // Pre-submit level 2 payload validation
  const validatePayload = useCallback(
    (payload, payloadRules = rules) => {
      const payloadErrors = validateForm(payload, payloadRules);
      if (hasErrors(payloadErrors)) {
        setErrors((prev) => ({ ...prev, ...payloadErrors }));
        return false;
      }
      return true;
    },
    [rules]
  );

  // Form submit handler with level 1 & level 2 validation
  const handleSubmit = useCallback(
    async (e, payloadTransformer = null) => {
      if (e && e.preventDefault) e.preventDefault();

      // Level 1: Field validation
      const isValid = validateAll();
      if (!isValid) return false;

      // Build & Level 2: Payload validation
      const payload = payloadTransformer ? payloadTransformer(values) : values;
      const isPayloadValid = validatePayload(payload);
      if (!isPayloadValid) return false;

      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(payload, values);
          // On success, reset dirty state to payload/values
          setInitial(values);
          return true;
        } catch (err) {
          // Map backend errors if available
          if (err?.response?.data?.errors) {
            setErrors((prev) => ({ ...prev, ...err.response.data.errors }));
          }
          throw err;
        } finally {
          setIsSubmitting(false);
        }
      }
      return true;
    },
    [validateAll, validatePayload, values, onSubmit]
  );

  // Reset form state
  const resetForm = useCallback(
    (newInitialValues = null) => {
      const resetVals = newInitialValues || initial;
      setValues(resetVals);
      setInitial(resetVals);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    },
    [initial]
  );

  // Map backend field errors onto form error state
  const setFieldError = useCallback((name, message) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  return {
    values,
    setValues,
    errors,
    setErrors,
    touched,
    setTouched,
    isSubmitting,
    setIsSubmitting,
    hasUnsavedChanges,
    handleChange,
    handleBlur,
    validateAll,
    validatePayload,
    handleSubmit,
    resetForm,
    setFieldError,
  };
}

export default useFormValidation;
