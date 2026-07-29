-- Migration: Add accepted_content to user_acceptances table
ALTER TABLE user_acceptances ADD COLUMN IF NOT EXISTS accepted_content TEXT;
