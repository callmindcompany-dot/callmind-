import { supabase } from "../supabaseClient";

export type UserRole = "founder" | "admin" | "sub_admin" | "manager" | "telecaller";

export interface SetClaimsParams {
  uid: string;
  companyId: string;
  role: UserRole;
}

export interface ClaimsResponse {
  message?: string;
  error?: string;
}

/**
 * Claims Service for Supabase
 * Handles updating user role and company association
 */
export const ClaimsService = {
  /**
   * Updates user role and company ID in the Supabase users table
   */
  async setUserClaims(params: SetClaimsParams): Promise<ClaimsResponse> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          company_id: params.companyId,
          role: params.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.uid);

      if (error) throw error;
      
      return { message: `Success! Role set to ${params.role} for user ${params.uid}` };
    } catch (error: any) {
      console.error("ClaimsService Error:", error);
      throw new Error(error.message || "Failed to set user claims");
    }
  },
};
