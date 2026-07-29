export interface HelpFaq {
  id: string;
  company_id: string | null;
  category: string;
  question: string;
  answer: string;
  order_num: number;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  company_id: string | null;
  user_id: string;
  role: 'user' | 'ai';
  message: string;
  created_at: string;
}

export interface VideoTutorial {
  id: string;
  title: string;
  youtube_id: string;
  duration: string;
  category: string;
  description: string;
  order_num: number;
  created_at?: string;
}

export interface PdfGuide {
  id: string;
  title: string;
  file_url: string;
  category: string;
  order_num: number;
  created_at?: string;
}

export interface CompanySupportSettings {
  company_id: string;
  support_email: string;
  support_whatsapp: string;
  updated_at?: string;
}
