import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { FieldAliasesMap, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseFieldAliasesParams {
  initialAliases: FieldAliasesMap;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
}

/**
 * useFieldAliases
 *
 * CRUD for field mapping aliases used in CSV / Webhook ingestion.
 */
export function useFieldAliases({ initialAliases, saveMutation }: UseFieldAliasesParams) {
  const [fieldAliases, setFieldAliases] = useState<FieldAliasesMap>(initialAliases);
  const [newAliasField, setNewAliasField] = useState('name');
  const [newAliasValue, setNewAliasValue] = useState('');

  const syncFromSettings = useCallback((aliases: FieldAliasesMap) => {
    setFieldAliases(aliases);
  }, []);

  const addAlias = useCallback(() => {
    const cleanAlias = newAliasValue.trim();
    if (!cleanAlias) return;

    if (fieldAliases[newAliasField]?.includes(cleanAlias)) {
      toast.error('Alias already exists for this field.');
      return;
    }

    const updated: FieldAliasesMap = {
      ...fieldAliases,
      [newAliasField]: [...(fieldAliases[newAliasField] || []), cleanAlias],
    };

    setFieldAliases(updated);
    setNewAliasValue('');

    saveMutation.mutate(
      { field_aliases: updated },
      { onSuccess: () => toast.success(`Alias "${cleanAlias}" registered for ${newAliasField}.`) }
    );
  }, [fieldAliases, newAliasField, newAliasValue, saveMutation]);

  const removeAlias = useCallback((fieldKey: string, aliasToRemove: string) => {
    const updatedList = (fieldAliases[fieldKey] || []).filter(v => v !== aliasToRemove);
    const updated: FieldAliasesMap = {
      ...fieldAliases,
      [fieldKey]: updatedList,
    };

    setFieldAliases(updated);

    saveMutation.mutate(
      { field_aliases: updated },
      { onSuccess: () => toast.success('Mapping alias removed.') }
    );
  }, [fieldAliases, saveMutation]);

  return {
    fieldAliases,
    newAliasField, setNewAliasField,
    newAliasValue, setNewAliasValue,
    addAlias,
    removeAlias,
    syncFromSettings,
  };
}
