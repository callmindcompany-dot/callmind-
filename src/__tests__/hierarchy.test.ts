import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HierarchyService } from '../services/hierarchy.service';

// Mock Supabase DB adapter
vi.mock('../lib/dbAdapter', () => {
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockOr = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();

  const createBuilder = () => {
    const builder: any = {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      or: mockOr,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    };
    mockSelect.mockReturnValue(builder);
    mockInsert.mockReturnValue(builder);
    mockUpdate.mockReturnValue(builder);
    mockEq.mockReturnValue(builder);
    mockOr.mockReturnValue(builder);
    mockOrder.mockReturnValue(builder);
    mockLimit.mockReturnValue(builder);
    return builder;
  };

  return {
    supabaseAdmin: {
      from: vi.fn(() => createBuilder()),
    },
  };
});

import { supabaseAdmin } from '../lib/dbAdapter';

describe('HierarchyService Unit & Integration Test Suite', () => {
  const mockCompanyId = 'comp-1234-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Feature Toggle State (OFF vs ON)', () => {
    it('should return enabled=false when branch management is toggled off', async () => {
      const mockFrom = supabaseAdmin.from as any;

      // Setup company query response
      mockFrom().single.mockResolvedValueOnce({
        data: { id: mockCompanyId, enable_branch_management: false, default_branch_id: null },
      });
      // Setup regions query response
      mockFrom().order.mockResolvedValueOnce({ data: [] });
      // Setup branches query response
      mockFrom().order.mockResolvedValueOnce({ data: [] });
      // Setup departments query response
      mockFrom().order.mockResolvedValueOnce({ data: [] });

      const tree = await HierarchyService.getHierarchyTree(mockCompanyId);

      expect(tree.enabled).toBe(false);
      expect(tree.regions).toEqual([]);
      expect(tree.branches).toEqual([]);
      expect(tree.departments).toEqual([]);
    });

    it('should update feature toggle state when toggleBranchManagement is called', async () => {
      const mockFrom = supabaseAdmin.from as any;
      mockFrom().single.mockResolvedValueOnce({
        data: { id: mockCompanyId, enable_branch_management: true },
        error: null,
      });

      const result = await HierarchyService.toggleBranchManagement(mockCompanyId, true);
      expect(result.enable_branch_management).toBe(true);
    });
  });

  describe('2. Parent-Child Tree Node Creation & Validation', () => {
    it('should throw an error if parent region does not belong to the same company tenant', async () => {
      const mockFrom = supabaseAdmin.from as any;
      // Region lookup returns null
      mockFrom().maybeSingle.mockResolvedValueOnce({ data: null });

      await expect(
        HierarchyService.createBranch(mockCompanyId, {
          name: 'Pune Branch',
          region_id: 'invalid-region-id',
        })
      ).rejects.toThrow('Invalid Region ID. Region does not belong to this organization.');
    });

    it('should successfully create region with trimmed input parameters', async () => {
      const mockFrom = supabaseAdmin.from as any;
      mockFrom().single.mockResolvedValueOnce({
        data: { id: 'reg-1', company_id: mockCompanyId, name: 'West Region', code: 'WEST' },
        error: null,
      });

      const reg = await HierarchyService.createRegion(mockCompanyId, ' West Region ', ' WEST ');
      expect(reg.name).toBe('West Region');
      expect(reg.code).toBe('WEST');
    });

    it('should successfully create branch when valid parent region is supplied', async () => {
      const mockFrom = supabaseAdmin.from as any;
      // Region lookup valid
      mockFrom().maybeSingle.mockResolvedValueOnce({ data: { id: 'reg-west' } });
      // Branch insert valid
      mockFrom().single.mockResolvedValueOnce({
        data: {
          id: 'branch-pune',
          company_id: mockCompanyId,
          region_id: 'reg-west',
          name: 'Pune Branch',
          city: 'Pune',
        },
        error: null,
      });

      const branch = await HierarchyService.createBranch(mockCompanyId, {
        name: 'Pune Branch',
        city: 'Pune',
        region_id: 'reg-west',
      });

      expect(branch.id).toBe('branch-pune');
      expect(branch.name).toBe('Pune Branch');
    });
  });

  describe('3. City-to-Branch Auto-Matching Engine', () => {
    it('should return null when lead city is empty or whitespace', async () => {
      const result = await HierarchyService.autoMatchLeadBranch(mockCompanyId, '   ');
      expect(result).toBeNull();
    });

    it('should return matched branch_id when lead city matches branch city', async () => {
      const mockFrom = supabaseAdmin.from as any;
      mockFrom().maybeSingle.mockResolvedValueOnce({
        data: { id: 'branch-pune-uuid' },
      });

      const branchId = await HierarchyService.autoMatchLeadBranch(mockCompanyId, 'Pune');
      expect(branchId).toBe('branch-pune-uuid');
    });
  });
});
