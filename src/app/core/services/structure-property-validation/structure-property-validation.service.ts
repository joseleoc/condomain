import { Injectable } from '@angular/core';
import { ValidationResult } from './validation.types';

/**
 * Shared validation service for structures and properties.
 * Contains business logic validation rules that are used by both
 * the Wizard (local data) and the Hub (backend data).
 *
 * This service does NOT handle UI concerns (toasts, alerts).
 * It returns validation results that the caller can use to
 * display appropriate error messages.
 */
@Injectable({ providedIn: 'root' })
export class StructurePropertyValidationService {
  /**
   * Validates a structure name for uniqueness and format.
   *
   * @param name - The structure name to validate
   * @param existingNames - Array of existing structure names to check against
   * @param editingId - Optional ID of the structure being edited (excludes self from uniqueness check)
   * @returns ValidationResult with valid flag and optional error key
   */
  validateStructureName(
    name: string,
    existingNames: string[],
    editingId?: string,
  ): ValidationResult {
    if (!name || name.trim().length === 0) {
      return { valid: false, errorKey: 'validation.required' };
    }

    if (name.length > 50) {
      return {
        valid: false,
        errorKey: 'validation.maxLength',
        errorParams: { length: 50 },
      };
    }

    const normalizedName = name.trim().toLowerCase();

    // Check for duplicate names (excluding the structure being edited)
    const isDuplicate = existingNames.some((existingName) => {
      const normalizedExisting = existingName.toLowerCase();
      // If we're editing, exclude the current structure from the check
      if (editingId) {
        // In wizard context, editingId is the structure name
        // In hub context, editingId is the UUID
        // We need to check if the name matches a DIFFERENT structure
        return (
          normalizedExisting === normalizedName &&
          existingName !== editingId // Exclude self by name (wizard) or ID (hub)
        );
      }
      return normalizedExisting === normalizedName;
    });

    if (isDuplicate) {
      return {
        valid: false,
        errorKey: 'condominium.createStructure.structureAlreadyExists',
        errorParams: { name },
      };
    }

    return { valid: true };
  }

  /**
   * Validates a property name/number for uniqueness within a structure.
   *
   * @param name - The property name/number to validate
   * @param existingPropertyNames - Array of existing property names in the same structure
   * @param editingPropertyName - Optional current name of the property being edited (excludes self from uniqueness check). Must be the property name, NOT the UUID.
   * @returns ValidationResult with valid flag and optional error key
   */
  validatePropertyName(
    name: string,
    existingPropertyNames: string[],
    editingPropertyName?: string,
  ): ValidationResult {
    if (!name || name.trim().length === 0) {
      return { valid: false, errorKey: 'validation.required' };
    }

    if (name.length > 64) {
      return {
        valid: false,
        errorKey: 'validation.maxLength',
        errorParams: { length: 64 },
      };
    }

    // Check for duplicate property names within the same structure
    const isDuplicate = existingPropertyNames.some((existingName) => {
      // If we're editing, exclude the current property from the check
      if (editingPropertyName) {
        return existingName === name && existingName !== editingPropertyName;
      }
      return existingName === name;
    });

    if (isDuplicate) {
      return {
        valid: false,
        errorKey: 'condominium.createStructure.propertyAlreadyExists',
        errorParams: { number: name },
      };
    }

    return { valid: true };
  }

  /**
   * Validates that the total share percentage doesn't exceed 100%.
   *
   * @param currentTotal - Current total percentage of all properties
   * @param newFee - The new fee/percentage being added or updated
   * @param editingFee - Optional current fee of the property being edited (to subtract from total)
   * @returns ValidationResult with valid flag and optional error key
   */
  validateTotalPercentage(
    currentTotal: number,
    newFee: number,
    editingFee?: number,
  ): ValidationResult {
    if (newFee < 0) {
      return {
        valid: false,
        errorKey: 'validation.min',
        errorParams: { value: 0 },
      };
    }

    if (newFee > 100) {
      return {
        valid: false,
        errorKey: 'validation.max',
        errorParams: { value: 100 },
      };
    }

    // Calculate the effective total (subtract editing fee if present)
    const effectiveTotal = editingFee !== undefined
      ? currentTotal - editingFee + newFee
      : currentTotal + newFee;

    if (effectiveTotal > 100) {
      return {
        valid: false,
        errorKey: 'condominium.createStructure.totalFeeExceeds100',
      };
    }

    return { valid: true };
  }
}
