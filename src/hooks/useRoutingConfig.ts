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
 * Manages how an inbound lead gets an owner: Manual, or Round Robin.
 *
 * The "exclude offline agents" checkbox and the "overflow SLA" dropdown are
 * gone. Neither was ever honoured -- processInboundLead keeps its active-agent
 * list at an empty array and never reads agent_status, and reassigning leads
 * that go untouched for N hours needs a scheduled job, which cannot exist while
 * pg_cron is absent. They also had no columns, so sending them raised 42703 and
 * took the assignment rule down with them: the one control that does work could
 * not be saved because of two that do not.
 */
export function useRoutingConfig({ companyId, initialConfig, saveMutation }: UseRoutingConfigParams) {
  const [assignmentRule, setAssignmentRule] = useState<'Manual' | 'RoundRobin'>(initialConfig.assignmentRule);

  const syncFromSettings = useCallback((config: RoutingConfig) => {
    setAssignmentRule(config.assignmentRule);
  }, []);

  const saveRouting = useCallback(() => {
    saveMutation.mutate(
      { assignment_mode: assignmentRule },
      {
        onSuccess: async () => {
          toast.success('🎉 Global routing rules updated!');
          if (companyId) {
            await supabase.from('audit_logs').insert({
              company_id: companyId,
              action: 'ASSIGNMENT_RULE_UPDATED',
              category: 'config',
              target: 'Lead Routing',
              details: `Routing: ${assignmentRule}.`,
            });
          }
        },
      }
    );
  }, [saveMutation, assignmentRule, companyId]);

  const quickToggle = useCallback((rule: 'Manual' | 'RoundRobin') => {
    setAssignmentRule(rule);
    saveMutation.mutate(
      { assignment_mode: rule },
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
    saveRouting,
    quickToggle,
    isSaving: saveMutation.isPending,
    syncFromSettings,
  };
}
