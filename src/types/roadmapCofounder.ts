export interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  category: string;
  phase: number;
  status: 'Planned' | 'In Progress' | 'Completed';
  progress: number;
  slides: {
    title: string;
    content: string;
    image: string;
  }[];
  votes: number;
  created_at?: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  value: boolean;
  updated_at?: string;
}

export interface CoFounder {
  id: string;
  company_id: string;
  email: string;
  name: string;
  role: 'Primary Founder' | 'Co-Founder' | 'Operator';
  permissions: {
    communication: boolean;
    sequences: boolean;
    scheduler: boolean;
    integrations: boolean;
  };
  status: 'Active' | 'Pending' | 'Revoked';
  invited_at?: string;
}
