-- Migration: 20260807000000_attendance_gps.sql
-- Goal: Add real GPS location fields, geofencing parameters, and idempotency to public.attendance_logs

ALTER TABLE public.attendance_logs
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS is_within_geofence BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_remote_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distance_from_office_meters DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Index for attendance location analytics
CREATE INDEX IF NOT EXISTS idx_attendance_user_timestamp ON public.attendance_logs(company_id, user_id, timestamp DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_company_idempotency ON public.attendance_logs(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
