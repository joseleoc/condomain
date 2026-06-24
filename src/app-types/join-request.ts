export type JoinRequestStatus = 'pending' | 'approved' | 'declined';

export interface JoinRequest {
  id: string;
  condominium_id: string;
  profile_id: string;
  invitation_code: string;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JoinRequestWithProfile extends JoinRequest {
  profiles: {
    id: string;
    name: string | null;
    email: string | null;
    avatar: string | null;
  };
}
