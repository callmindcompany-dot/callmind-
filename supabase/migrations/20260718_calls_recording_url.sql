-- Migration: Add recording_url to calls table and create log_manual_call database function

ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Create log_manual_call database function for atomic manual logs
CREATE OR REPLACE FUNCTION public.log_manual_call(
    p_company_id TEXT,
    p_user_id TEXT,
    p_user_email TEXT,
    p_lead_name TEXT,
    p_phone TEXT,
    p_duration TEXT,
    p_status TEXT,
    p_type TEXT,
    p_interest TEXT,
    p_ai_summary TEXT,
    p_scheduled_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lead_id TEXT;
    v_call_id TEXT;
    v_callback_id TEXT;
    v_mapped_status TEXT;
    v_clean_phone TEXT;
BEGIN
    -- Clean phone number (numeric digits only)
    v_clean_phone := REGEXP_REPLACE(p_phone, '[\s\-()]', '', 'g');

    -- 1. Check if lead exists in target company
    SELECT id INTO v_lead_id
    FROM public.leads
    WHERE company_id = p_company_id AND phone = v_clean_phone
    LIMIT 1;

    -- 2. Update lead status if exists
    IF v_lead_id IS NOT NULL THEN
        IF p_status = 'completed' THEN
            IF p_interest = 'Interested' THEN
                v_mapped_status := 'Interested';
            ELSE
                v_mapped_status := 'Contacted';
            END IF;
        ELSIF p_status = 'failed' AND p_interest = 'Not Interested' THEN
            v_mapped_status := 'Rejected';
        ELSE
            v_mapped_status := 'Call Back';
        END IF;

        UPDATE public.leads
        SET status = v_mapped_status,
            updated_at = NOW()
        WHERE id = v_lead_id;
    END IF;

    -- 3. Insert Call Log
    v_call_id := gen_random_uuid()::text;
    
    INSERT INTO public.calls (
        id,
        company_id,
        lead_id,
        lead_name,
        phone,
        duration,
        status,
        type,
        interest,
        ai_summary,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        v_call_id,
        p_company_id,
        v_lead_id,
        p_lead_name,
        v_clean_phone,
        p_duration,
        p_status,
        p_type,
        p_interest,
        COALESCE(p_ai_summary, 'Manual call logged by agent.'),
        p_user_email,
        NOW(),
        NOW()
    );

    -- 4. Create callback follow-up if scheduled time is provided
    IF p_scheduled_time IS NOT NULL THEN
        v_callback_id := gen_random_uuid()::text;
        INSERT INTO public.callbacks (
            id,
            company_id,
            lead_id,
            assigned_to,
            reminder_date,
            notes,
            status,
            created_at
        ) VALUES (
            v_callback_id,
            p_company_id,
            COALESCE(v_lead_id, v_call_id),
            p_user_email,
            p_scheduled_time,
            'Manual Follow-up (S-08)',
            'Pending',
            NOW()
        );
    END IF;

    -- 5. Create audit log
    INSERT INTO public.audit_logs (
        id,
        company_id,
        action,
        category,
        target,
        target_id,
        details,
        user_name,
        timestamp
    ) VALUES (
        gen_random_uuid()::text,
        p_company_id,
        'calls.manual.logged',
        'Lead',
        'lead',
        COALESCE(v_lead_id, v_call_id),
        'Lead: ' || p_lead_name || ', Status: ' || p_status,
        p_user_email,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'callId', v_call_id,
        'leadId', v_lead_id,
        'callbackId', v_callback_id
    );
END;
$$;
