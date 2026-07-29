export interface AIConfig {
  id: string;
  company_id: string;
  auto_call: boolean;
  record_calls: boolean;
  sentiment_analysis: boolean;
  voice_type: string;
  system_prompt: string;
  created_at?: string;
  updated_at?: string;
}

export interface AIFaq {
  id: string;
  company_id: string;
  question: string;
  answer: string;
  created_at?: string;
  updated_at?: string;
}
