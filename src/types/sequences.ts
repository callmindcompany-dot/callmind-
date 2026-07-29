export type SequenceNodeType = 
  | 'trigger' 
  | 'delay' 
  | 'whatsapp' 
  | 'email' 
  | 'sms' 
  | 'notification' 
  | 'webhook' 
  | 'branch' 
  | 'action';

export interface SequenceNode {
  id: string;
  type: SequenceNodeType;
  title: string;
  delay?: string;
  content?: string;
  condition?: string;
  metadata?: Record<string, any>;
}

export interface Sequence {
  id: string;
  company_id: string;
  name: string;
  enrolled: number;
  completion: number;
  success_rate: number;
  status: 'active' | 'paused';
  updated_at: string;
  nodes: SequenceNode[];
}
