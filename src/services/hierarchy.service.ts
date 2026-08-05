import { supabaseAdmin } from '../lib/dbAdapter';
import { logger } from '../lib/logger';

export interface HierarchyRegion {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  is_active: boolean;
  created_at: string;
}

export interface HierarchyBranch {
  id: string;
  company_id: string;
  region_id?: string;
  state_id?: string;
  name: string;
  code?: string;
  city?: string;
  address?: string;
  is_main_branch: boolean;
  is_active: boolean;
  created_at: string;
}

export interface HierarchyDepartment {
  id: string;
  company_id: string;
  branch_id?: string;
  name: string;
  code?: string;
  is_active: boolean;
  created_at: string;
}

export class HierarchyService {
  /**
   * Fetch complete Organization Hierarchy Tree (Regions ➔ Branches ➔ Departments)
   */
  static async getHierarchyTree(companyId: string) {
    try {
      const [
        { data: company },
        { data: regions },
        { data: branches },
        { data: departments },
      ] = await Promise.all([
        supabaseAdmin.from('companies').select('id, enable_branch_management, default_branch_id').eq('id', companyId).single(),
        supabaseAdmin.from('regions').select('*').eq('company_id', companyId).order('name', { ascending: true }),
        supabaseAdmin.from('branches').select('*').eq('company_id', companyId).order('name', { ascending: true }),
        supabaseAdmin.from('departments').select('*').eq('company_id', companyId).order('name', { ascending: true }),
      ]);

      return {
        enabled: company?.enable_branch_management || false,
        defaultBranchId: company?.default_branch_id || null,
        regions: regions || [],
        branches: branches || [],
        departments: departments || [],
      };
    } catch (err: any) {
      logger.error('[HierarchyService] Fetch error:', err);
      throw err;
    }
  }

  /**
   * Toggle Feature State (Enable/Disable Branch Management)
   */
  static async toggleBranchManagement(companyId: string, enabled: boolean) {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({ enable_branch_management: enabled })
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      logger.error('[HierarchyService] Toggle error:', error);
      throw error;
    }

    return data;
  }

  /**
   * Create Region
   */
  static async createRegion(companyId: string, name: string, code?: string) {
    const { data, error } = await supabaseAdmin
      .from('regions')
      .insert({ company_id: companyId, name: name.trim(), code: code?.trim() })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create Branch with Parent-Child Link Validation
   */
  static async createBranch(
    companyId: string,
    branchData: {
      name: string;
      code?: string;
      region_id?: string;
      state_id?: string;
      city?: string;
      address?: string;
    }
  ) {
    // Parent-Child Validation: Ensure region belongs to same company
    if (branchData.region_id) {
      const { data: reg } = await supabaseAdmin
        .from('regions')
        .select('id')
        .eq('company_id', companyId)
        .eq('id', branchData.region_id)
        .maybeSingle();

      if (!reg) throw new Error('Invalid Region ID. Region does not belong to this organization.');
    }

    const { data, error } = await supabaseAdmin
      .from('branches')
      .insert({
        company_id: companyId,
        name: branchData.name.trim(),
        code: branchData.code?.trim(),
        region_id: branchData.region_id || null,
        state_id: branchData.state_id || null,
        city: branchData.city?.trim(),
        address: branchData.address?.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create Department
   */
  static async createDepartment(companyId: string, branchId: string, name: string, code?: string) {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .insert({
        company_id: companyId,
        branch_id: branchId,
        name: name.trim(),
        code: code?.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * City-to-Branch Auto-Matching for Lead Assignment Engine
   * Example: If Lead City = "Pune", auto-matches Branch with city/name "Pune"
   */
  static async autoMatchLeadBranch(companyId: string, leadCity?: string): Promise<string | null> {
    if (!leadCity || leadCity.trim().length === 0) return null;

    const cleanCity = leadCity.trim();

    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .or(`city.ilike.%${cleanCity}%,name.ilike.%${cleanCity}%`)
      .limit(1)
      .maybeSingle();

    return branch?.id || null;
  }
}
