-- Migration: Onboarding Join Rebuild and Atomic Functions

-- 1. Create companies table if not exists
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'trial',
    plan_status TEXT DEFAULT 'trialing',
    seat_limit INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add status column to users table if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Create validate_join_request SQL function
CREATE OR REPLACE FUNCTION public.validate_join_request(
    p_company_id TEXT,
    p_join_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_name TEXT;
    v_plan TEXT;
    v_plan_status TEXT;
    v_seat_limit INT;
    v_invite_id TEXT;
    v_max_uses INT;
    v_used_count INT;
    v_expires_at TIMESTAMPTZ;
    v_trimmed_code TEXT;
    v_actual_members INT;
BEGIN
    -- 1. Check Company existence
    SELECT name, plan, plan_status, seat_limit
    INTO v_company_name, v_plan, v_plan_status, v_seat_limit
    FROM public.companies
    WHERE id = p_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'No active team hub exists with this Company ID.');
    END IF;

    -- 2. Validate Invite
    v_trimmed_code := UPPER(TRIM(p_join_code));
    
    SELECT id, max_uses, used_count, expires_at
    INTO v_invite_id, v_max_uses, v_used_count, v_expires_at
    FROM public.invites
    WHERE company_id = p_company_id
      AND status = 'active'
      AND (UPPER(join_code) = v_trimmed_code OR UPPER(token) = v_trimmed_code OR UPPER(id) = v_trimmed_code)
    LIMIT 1;

    IF v_invite_id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'This invitation code is either invalid, revoked, or has expired.');
    END IF;

    -- Check Expiration Date
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RETURN jsonb_build_object('valid', false, 'error', 'This onboarding invitation code has expired.');
    END IF;

    -- Check Max Uses
    IF v_max_uses IS NOT NULL AND v_used_count >= v_max_uses THEN
        RETURN jsonb_build_object('valid', false, 'error', 'All available slots for this invitation code have been consumed.');
    END IF;

    -- 3. Check Seat Capacity
    IF v_seat_limit IS NULL THEN
        IF LOWER(COALESCE(v_plan, '')) LIKE '%enterprise%' THEN
            v_seat_limit := 1000;
        ELSIF LOWER(COALESCE(v_plan, '')) LIKE '%professional%' OR LOWER(COALESCE(v_plan, '')) LIKE '%team%' OR LOWER(COALESCE(v_plan, '')) LIKE '%growth%' THEN
            v_seat_limit := 50;
        ELSIF LOWER(COALESCE(v_plan, '')) LIKE '%trial%' THEN
            v_seat_limit := 3;
        ELSE
            v_seat_limit := 10; -- Default fallback
        END IF;
    END IF;

    -- Count active members in users table
    SELECT COUNT(*)
    INTO v_actual_members
    FROM public.users
    WHERE company_id = p_company_id
      AND LOWER(COALESCE(status, 'active')) NOT IN ('disabled', 'removed');

    -- The count above is the answer. There was a denormalised
    -- companies.active_members_count here that could override it upwards, but
    -- nothing in the product ever wrote to that column, so it would have been
    -- permanently zero -- or, worse, permanently stale once something did write
    -- it once. The users table is the only place seat occupancy actually lives.

    IF v_actual_members >= v_seat_limit THEN
        RETURN jsonb_build_object(
            'valid', false, 
            'error', 'This company team hub has reached its maximum seat capacity (' || v_actual_members || '/' || v_seat_limit || '). Please contact the system administrator to upgrade their plan.'
        );
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'companyName', v_company_name,
        'maxUses', v_max_uses,
        'usedCount', v_used_count
    );
END;
$$;

-- 4. Create submit_join_request SQL function
CREATE OR REPLACE FUNCTION public.submit_join_request(
    p_company_id TEXT,
    p_user_id TEXT,
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_city TEXT,
    p_language TEXT,
    p_join_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_validation JSONB;
    v_invite_id TEXT;
    v_invite_token TEXT;
    v_new_id TEXT;
    v_requested_via TEXT;
    v_trimmed_code TEXT;
BEGIN
    -- 1. Validate parameters atomically using validate_join_request
    v_validation := public.validate_join_request(p_company_id, p_join_code);
    IF NOT (v_validation->>'valid')::BOOLEAN THEN
        RETURN jsonb_build_object('success', false, 'error', v_validation->>'error');
    END IF;

    -- 2. Find invite to get token details
    v_trimmed_code := UPPER(TRIM(p_join_code));
    SELECT id, token
    INTO v_invite_id, v_invite_token
    FROM public.invites
    WHERE company_id = p_company_id
      AND status = 'active'
      AND (UPPER(join_code) = v_trimmed_code OR UPPER(token) = v_trimmed_code OR UPPER(id) = v_trimmed_code)
    LIMIT 1;

    -- Determine requested_via channel
    IF v_invite_token IS NOT NULL AND v_invite_token <> '' THEN
        v_requested_via := 'qr_live';
    ELSE
        v_requested_via := 'join_code';
    END IF;

    v_new_id := gen_random_uuid()::text;

    -- 3. Insert Onboarding Request
    INSERT INTO public.join_requests (
        id,
        company_id,
        user_id,
        name,
        email,
        phone,
        city,
        language,
        requested_via,
        join_code,
        token,
        status,
        requested_at
    ) VALUES (
        v_new_id,
        p_company_id,
        p_user_id,
        p_name,
        p_email,
        p_phone,
        p_city,
        p_language,
        v_requested_via,
        p_join_code,
        v_invite_token,
        'pending',
        NOW()
    );

    -- 4. Increment active invite used slots
    UPDATE public.invites
    SET used_count = used_count + 1,
        updated_at = NOW()
    WHERE id = v_invite_id;

    RETURN jsonb_build_object(
        'success', true,
        'requestId', v_new_id
    );
END;
$$;

-- 5. No seed data.
--
-- This used to insert a company called 'Test Company Hub' with a working join
-- code of 'TESTCODE'. A migration runs everywhere, so that tenant and that code
-- would exist in production -- anyone who guessed the code could join it. Test
-- fixtures belong in a seed script that is run deliberately, not in a
-- migration that runs on every deploy.
