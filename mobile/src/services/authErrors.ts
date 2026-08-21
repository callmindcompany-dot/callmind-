/**
 * Clean & Human-Friendly Auth Error Parser
 *
 * Ensures technical artifacts, raw JSON payloads, Supabase URLs,
 * and cryptic database messages are NEVER shown to the user.
 */

export interface ParsedAuthError {
  message: string;
  field?: 'email' | 'password' | 'fullName' | 'general';
  action?: 'switch_to_login' | 'switch_to_signup' | 'verify_email';
}

export function formatAuthError(error: any): ParsedAuthError {
  if (!error) {
    return { message: 'An unexpected error occurred. Please try again.', field: 'general' };
  }

  let rawMessage = '';
  let status: number | undefined;
  let code: string | undefined;

  // Extract from string, Error object, or Supabase AuthApiError
  if (typeof error === 'string') {
    rawMessage = error;
  } else if (typeof error === 'object') {
    status = error.status || error.statusCode;
    code = error.code || error.error_code;
    rawMessage = error.message || error.error_description || error.msg || '';

    // If message is a JSON string representation, try parsing it safely
    if (typeof rawMessage === 'string' && (rawMessage.startsWith('{') || rawMessage.includes('status":500'))) {
      try {
        const parsed = JSON.parse(rawMessage);
        if (parsed.message) rawMessage = parsed.message;
        if (parsed.msg) rawMessage = parsed.msg;
        if (parsed.status) status = parsed.status;
      } catch {
        // Not valid JSON, keep raw string
      }
    }
  }

  const lower = (rawMessage || '').toLowerCase();

  // 1. Invalid Login Credentials / Wrong Password
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('wrong password') ||
    lower.includes('invalid grant') ||
    lower.includes('invalid email or password')
  ) {
    return {
      message: 'Incorrect email or password. Please check and try again.',
      field: 'password',
    };
  }

  // 2. User Already Registered / Existing Account
  if (
    lower.includes('user already registered') ||
    lower.includes('user_already_exists') ||
    lower.includes('already exists') ||
    lower.includes('duplicate key') ||
    lower.includes('already registered')
  ) {
    return {
      message: 'An account with this email already exists. Please sign in instead.',
      field: 'email',
      action: 'switch_to_login',
    };
  }

  // 3. User Not Found
  if (lower.includes('user not found') || lower.includes('no user found')) {
    return {
      message: 'No account found with this email. Please create a new account.',
      field: 'email',
      action: 'switch_to_signup',
    };
  }

  // 4. Email Not Confirmed
  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return {
      message: 'Please check your email inbox and verify your account to continue.',
      field: 'email',
      action: 'verify_email',
    };
  }

  // 5. Password Length / Strength
  if (lower.includes('password should be at least') || lower.includes('password is too short') || lower.includes('min 6 characters')) {
    return {
      message: 'Password must be at least 6 characters long.',
      field: 'password',
    };
  }

  // 6. Invalid Email Syntax
  if (lower.includes('invalid email') || lower.includes('valid email') || lower.includes('unable to validate email')) {
    return {
      message: 'Please enter a valid email address.',
      field: 'email',
    };
  }

  // 7. Rate Limiting / Too Many Attempts
  if (lower.includes('rate limit') || lower.includes('too many requests') || status === 429) {
    return {
      message: 'Too many attempts. Please wait a few seconds before trying again.',
      field: 'general',
    };
  }

  // 8. Google / OAuth Provider Disabled or Misconfigured
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider') || lower.includes('validation_failed')) {
    return {
      message: 'Google Sign-In is temporarily unavailable. Please sign in with email.',
      field: 'general',
    };
  }

  // 9. Network / Offline / Connection Errors
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('timeout') ||
    lower.includes('connection error') ||
    lower.includes('abort')
  ) {
    return {
      message: 'Unable to connect. Please check your internet connection.',
      field: 'general',
    };
  }

  // 10. Server 500 / Unexpected Failure
  if (status === 500 || lower.includes('unexpected_failure') || lower.includes('internal server error')) {
    return {
      message: 'Server could not process this request right now. Please try again or use Google Sign-In.',
      field: 'general',
    };
  }

  // Safe Clean Fallback (strip any URLs, tokens, or braces)
  if (rawMessage && rawMessage.length < 80 && !rawMessage.includes('http') && !rawMessage.includes('{')) {
    return { message: rawMessage, field: 'general' };
  }

  return {
    message: 'Unable to complete sign in. Please verify your details and try again.',
    field: 'general',
  };
}
