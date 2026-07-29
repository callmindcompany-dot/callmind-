import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { GeminiKey, AiTaskType } from '../types/aiKeys';
import { getEnvGeminiKeys } from '../lib/aiRouter';

const LOCAL_STORAGE_KEY = 'callmind_gemini_keys_pool';

/**
 * Helper to get local stored keys or default env keys
 */
function getStoredLocalKeys(): GeminiKey[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse local Gemini keys:', err);
  }
  return getEnvGeminiKeys();
}

/**
 * Helper to save local keys
 */
function saveLocalKeys(keys: GeminiKey[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(keys));
  } catch (err) {
    console.warn('Failed to save local Gemini keys:', err);
  }
}

/**
 * Custom hook to read and manage Gemini API keys pool
 */
export function useAiKeys(companyId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['aiKeys', companyId],
    queryFn: async (): Promise<GeminiKey[]> => {
      if (!companyId) {
        return getStoredLocalKeys();
      }

      const { data, error } = await supabase
        .from('team_settings')
        .select('gemini_keys')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching gemini_keys from team_settings:', error);
        return getStoredLocalKeys();
      }

      if (data && Array.isArray(data.gemini_keys) && data.gemini_keys.length > 0) {
        saveLocalKeys(data.gemini_keys);
        return data.gemini_keys as GeminiKey[];
      }

      // Default env keys if DB keys empty
      const defaultKeys = getEnvGeminiKeys();
      return defaultKeys;
    },
    staleTime: 30000,
  });

  const saveMutation = useMutation({
    mutationFn: async (updatedKeys: GeminiKey[]) => {
      saveLocalKeys(updatedKeys);
      if (!companyId) return updatedKeys;

      const { error } = await supabase
        .from('team_settings')
        .upsert(
          { company_id: companyId, gemini_keys: updatedKeys },
          { onConflict: 'company_id' }
        );

      if (error) {
        console.error('Failed to update gemini_keys in Supabase:', error);
        throw error;
      }
      return updatedKeys;
    },
    onSuccess: (updatedKeys) => {
      queryClient.setQueryData(['aiKeys', companyId], updatedKeys);
    },
  });

  const keys = query.data || [];

  const addKey = (keyString: string, tasks: AiTaskType[]) => {
    const trimmed = keyString.trim();
    if (!trimmed) return;

    const newKey: GeminiKey = {
      id: `key-${Date.now()}`,
      key: trimmed,
      tasks: tasks.length > 0 ? tasks : ['draft', 'sentiment', 'bulk', 'chat'],
      isActive: true,
    };

    const updated = [...keys, newKey];
    saveMutation.mutate(updated);
  };

  const removeKey = (id: string) => {
    const updated = keys.filter(k => k.id !== id);
    saveMutation.mutate(updated);
  };

  const toggleKeyActive = (id: string) => {
    const updated = keys.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k);
    saveMutation.mutate(updated);
  };

  const updateKeyTasks = (id: string, tasks: AiTaskType[]) => {
    const updated = keys.map(k => k.id === id ? { ...k, tasks } : k);
    saveMutation.mutate(updated);
  };

  return {
    keys,
    isLoading: query.isLoading,
    isSaving: saveMutation.isPending,
    addKey,
    removeKey,
    toggleKeyActive,
    updateKeyTasks,
    refetch: query.refetch,
  };
}
