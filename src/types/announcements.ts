export interface Announcement {
  id: string;
  company_id: string;
  title: string;
  content: string;
  category: 'Update' | 'Maintenance' | 'Team' | 'Product' | 'Event';
  target_role: 'all' | 'admin' | 'agent';
  is_pinned: boolean;
  is_published: boolean;
  scheduled_at: string | null;
  published_at?: string;
  author_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}
