/**
 * Shared form types for structure and property forms.
 * These types are used by the presentational form components
 * and their orchestrators (Wizard, Hub modals).
 */

// --- Structure Form Types ---

export interface StructureFormInitialData {
  name: string;
  description: string | null;
}

export interface StructureFormValue {
  name: string;
  description: string | null;
}

// --- Property Form Types ---

export interface PropertyFormInitialData {
  name: string;
  share_percentage: number;
  structure_id: string;
  owner_name: string | null;
  owner_email: string | null;
}

export interface PropertyFormValue {
  name: string;
  share_percentage: number;
  structure_id: string;
  owner_name: string | null;
  owner_email: string | null;
}

export interface StructureOption {
  id: string;
  name: string;
}
