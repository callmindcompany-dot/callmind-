BEGIN;
  -- Drop existing foreign key if exists
  ALTER TABLE user_acceptances 
  DROP CONSTRAINT IF EXISTS user_acceptances_user_id_fkey;
  
  -- Change column type
  ALTER TABLE user_acceptances 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  
  -- Recreate foreign key
  ALTER TABLE user_acceptances 
  ADD CONSTRAINT user_acceptances_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
COMMIT;
