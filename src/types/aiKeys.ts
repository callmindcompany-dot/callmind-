export type AiTaskType = 'draft' | 'sentiment' | 'bulk' | 'chat';

export interface GeminiKey {
  id: string;          // unique, e.g. 'key-1'
  key: string;         // actual API key (masked in UI)
  tasks: AiTaskType[]; // assigned tasks
  isActive: boolean;
}
