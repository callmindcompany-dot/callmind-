import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import type { RoutingConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseRoutingConfigParams {
  companyId: string | null;
  initialConfig: RoutingConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
}

/**
 * useRoutingConfig
 *
 * Manages lead distribution (Manual/RoundRobin) and overflow SLA settings.
 */
export function useRoutingConfig({ companyId, initialConfig, saveMutation }: UseRoutingConfigParams) {
  const [assignmentRule, setAssignmentRule] = useState<'Manual' | 'RoundRobin'>(initialConfig.assignmentRule);
  const [excludeInactive, setExcludeInactive] = useState(initialConfig.excludeInactive);
  const [overflowHours, setOverflowHours] = useState(initialConfig.overflowHours);

  const syncFromSettings = useCallback((config: RoutingConfig) => {
    setAssignmentRule(config.assignmentRule);
    setExcludeInactive(config.excludeInactive);
    setOverflowHours(config.overflowHours);
  }, []);

  const saveRouting = useCallback(() => {
    saveMutation.mutate(
      {
        assignment_rule: assignmentRule,
        routing_exclude_inactive: excludeInactive,
        routing_overflow_hours: overflowHours,
      },
      {
        onSuccess: async () => {
          toast.success('🎉 Global routing rules updated!');
          if (companyId) {
            await supabase.from('audit_logs').insert({
              company_id: companyId,
              action: 'ASSIGNMENT_RULE_UPDATED',
              category: 'config',
              target: 'Lead Routing',
              details: `Routing: ${assignmentRule}. Exclude inactive: ${excludeInactive}. Overflow: ${overflowHours}h.`,
                          });
          }
        },
      }
    );
  }, [saveMutation, assignmentRule, excludeInactive, overflowHours, companyId]);

  const quickToggle = useCallback((rule: 'Manual' | 'RoundRobin') => {
    setAssignmentRule(rule);
    saveMutation.mutate(
      { assignment_rule: rule },
      {
        onSuccess: async () => {
          toast.success(`Routing mode set to: ${rule}`);
          if (companyId) {
            await supabase.from('audit_logs').insert({
              company_id: companyId,
              action: 'ASSIGNMENT_RULE_UPDATED',
              category: 'config',
              target: 'Lead Routing',
              details: `Quick toggle to ${rule}`,
                          });
          }
        },
      }
    );
  }, [saveMutation, companyId]);

  return {
    assignmentRule, setAssignmentRule,
    excludeInactive, setExcludeInactive,
    overflowHours, setOverflowHours,
    saveRouting,
    quickToggle,
    isSaving: saveMutation.isPending,
    syncFromSettings,
  };
}
