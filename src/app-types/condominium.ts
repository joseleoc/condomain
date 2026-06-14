export interface Condominium {
    id: string;
    name: string;
    /** The location to display in the UI */
    address?: string;
    /** The avatar id only */
    avatar?: string;
    /** Currency ISO Code which references the currencies table */
    currency: string;
    owner_id: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    is_deleted: boolean;
}