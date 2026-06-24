-- Add invitation_code column to condominiums table
ALTER TABLE condominiums
ADD COLUMN invitation_code TEXT UNIQUE;

-- Create function to generate unique 6-digit invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Only generate if not already set
  IF NEW.invitation_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Generate unique code with retry loop
  LOOP
    code := lpad(floor(random() * 1000000)::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM condominiums WHERE invitation_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.invitation_code := code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invitation code on insert
CREATE TRIGGER set_invitation_code_on_insert
  BEFORE INSERT ON condominiums
  FOR EACH ROW
  EXECUTE FUNCTION generate_invitation_code();
