-- Create table for condominium join requests
CREATE TABLE condominium_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitation_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(condominium_id, profile_id, status) -- Prevent duplicate pending requests
);

-- Index for fetching pending requests by condominium
CREATE INDEX idx_join_requests_condo_status ON condominium_join_requests(condominium_id, status);

-- Index for fetching requests by profile
CREATE INDEX idx_join_requests_profile ON condominium_join_requests(profile_id);
