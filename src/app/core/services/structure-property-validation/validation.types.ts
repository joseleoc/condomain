/**
 * Validation result returned by the validation service.
 */
export interface ValidationResult {
  valid: boolean;
  errorKey?: string;
  errorParams?: Record<string, unknown>;
}
