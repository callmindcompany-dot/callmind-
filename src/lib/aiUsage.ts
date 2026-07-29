import { supabase } from '@/supabaseClient';

export type AIFeatureType = 'waDrafts' | 'voiceToCrm' | 'reportQueries' | 'columnMappings';

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * atomic increment of AI feature usage for a company in Supabase
 */
export async function incrementAIUsage(companyId: string | null | undefined, featureType: AIFeatureType) {
  if (!companyId) return;

  const today = new Date().toISOString().split('T')[0];
  const dbColumn = toSnakeCase(featureType);

  try {
    // 1. Fetch current usage row for company + today
    const { data, error: selectError } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('company_id', companyId)
      .eq('date', today)
      .maybeSingle();

    if (selectError) throw selectError;

    // 2. Perform upsert
    const currentVal = data ? (data[dbColumn] || 0) : 0;
    const currentTotal = data ? (data.total || 0) : 0;

    const { error: upsertError } = await supabase
      .from('ai_usage')
      .upsert({
        company_id: companyId,
        date: today,
        [dbColumn]: currentVal + 1,
        total: currentTotal + 1
      }, {
        onConflict: 'company_id,date'
      });

    if (upsertError) throw upsertError;
  } catch (error) {
    console.error(`Error incrementing AI usage for ${featureType}:`, error);
  }
}
