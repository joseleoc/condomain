export interface CondominiumInvitationCode {
  id: string;
  condominium_id: string;
  /** 6-digit invitation code */
  code: string;
  /** Maximum number of uses. NULL = unlimited uses */
  max_uses: number | null;
  /** Current number of times this code has been used */
  uses_count: number;
  /** Expiration timestamp. NULL = no expiration */
  expires_at: string | null;
  /** Whether the invitation is active */
  active: boolean;
  /** Profile ID of the user who created this invitation */
  created_by: string;
  version: number;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
