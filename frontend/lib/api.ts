import axios, { AxiosInstance } from 'axios';

/* ===================== CONFIG ===================== */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

/* ===================== AXIOS INSTANCE ===================== */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/* ===================== AUTH HANDLING ===================== */
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const isPublicEndpoint = config.url?.includes('/login/') || config.url?.includes('/register/');

      if (token && !isPublicEndpoint) {
        config.headers.Authorization = `Token ${token}`; // ✅ DRF TokenAuth
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const publicPaths = ['/', '/login', '/register', '/complaints/status'];
      const isPublicPath = publicPaths.includes(window.location.pathname) ||
        window.location.pathname.includes('/complaints/');

      if (!isPublicPath) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/* ===================== AUTH ===================== */
export const login = async (data: { username: string; password: string }) => {
  const res = await api.post('/login/', data);
  return res.data;
};

export const register = async (data: {
  username: string;
  password: string;
  password_confirm: string;
  device_fingerprint?: string;
}) => {
  const res = await api.post('/register/', data);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

/* ===================== USER PROFILE ===================== */
export const getProfile = async () => {
  const res = await api.get('/profile/me/');
  return res.data;
};

export const createProfile = async (data: { style: string; preferences: any }) => {
  // Map createProfile to update_profile since we are updating the existing user user
  const res = await api.put('/profile/update_profile/', data);
  return res.data;
};

export const updateProfile = async (data: any) => {
  const res = await api.put('/profile/update_profile/', data);
  return res.data;
};

export const changePassword = async (data: any) => {
  const res = await api.post('/profile/change_password/', data);
  return res.data;
};

export const verifyPassword = async (password: string) => {
  const res = await api.post('/verify-password/', { password });
  return res.data;
};

export const deleteAccount = async (password: string) => {
  const res = await api.post('/profile/delete_account/', { password });
  return res.data;
};

/* ===================== COMPLAINTS ===================== */
export interface ComplaintCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  requires_evidence: boolean;
}

export interface Complaint {
  complaint_id: string;
  tracking_code: string;
  category: ComplaintCategory;
  severity: number;
  severity_display: string;
  status: string;
  status_display: string;
  submission_date: string;
  response_deadline: string;
  days_until_deadline: number;
  is_read: boolean;
  evidence_count?: number;
  upvote_count?: number;
  content?: string;
  escalation_level?: number;
  actions?: { action_type: string; created_at: string; performed_by_name?: string; notes?: string }[];
  is_edited: boolean;
  has_new_reply: boolean;       // admin replied → student notified
  has_student_reply: boolean;   // student replied → admin notified
  image_attachment?: string;
  created_at: string;
}

export const getCategories = async (): Promise<ComplaintCategory[]> => {
  const res = await api.get('/complaints/categories/');
  return res.data;
};

export const submitComplaint = async (data: {
  content: string;
  category_slug: string;
  severity?: number;
  session_hash?: string;
  image_attachment?: string;
}) => {
  const res = await api.post('/complaints/complaints/', data);
  return res.data;
};

export const suggestCategory = async (content: string) => {
  const res = await api.post('/complaints/complaints/suggest-category/', { content });
  return res.data;
};

export const checkSimilarity = async (content: string) => {
  const res = await api.post('/complaints/complaints/check_similarity/', { content });
  return res.data;
};

export const checkComplaintStatus = async (code: string, sessionHash?: string): Promise<Complaint> => {
  const res = await api.get('/complaints/complaints/status/', {
    params: { code, session_hash: sessionHash }
  });
  return res.data;
};

export const getMyComplaints = async (): Promise<Complaint[]> => {
  const res = await api.get('/complaints/complaints/');
  return res.data;
};



export const getComplaintDetail = async (id: string, trackingCode?: string): Promise<Complaint> => {
  const sessionHash = typeof window !== 'undefined' ? localStorage.getItem('anonymous_session_hash') : null;
  const params: any = { session_hash: sessionHash };
  if (trackingCode) params.code = trackingCode;

  const res = await api.get(`/complaints/complaints/${id}/`, { params });
  return res.data;
};

export const replyToComplaint = async (id: string, content: string) => {
  const res = await api.post(`/complaints/complaints/${id}/reply/`, { content });
  return res.data;
};

export const studentReplyToComplaint = async (id: string, content: string) => {
  const res = await api.post(`/complaints/complaints/${id}/student_reply/`, { content });
  return res.data;
};

export const escalateComplaint = async (id: string) => {
  const res = await api.post(`/complaints/complaints/${id}/escalate/`);
  return res.data;
};

export const resolveComplaint = async (id: string, trackingCode?: string) => {
  const sessionHash = typeof window !== 'undefined' ? localStorage.getItem('anonymous_session_hash') : null;
  const params: any = { session_hash: sessionHash };
  if (trackingCode) params.code = trackingCode;

  const res = await api.post(`/complaints/complaints/${id}/resolve/`, {}, { params });
  return res.data;
};

export const deleteComplaint = async (id: string, trackingCode?: string) => {
  const sessionHash = typeof window !== 'undefined' ? localStorage.getItem('anonymous_session_hash') : null;
  const params: any = { session_hash: sessionHash };
  if (trackingCode) params.code = trackingCode;

  await api.delete(`/complaints/complaints/${id}/`, { params });
};

export const updateComplaint = async (id: string, data: any, trackingCode?: string) => {
  const sessionHash = typeof window !== 'undefined' ? localStorage.getItem('anonymous_session_hash') : null;
  const params: any = { session_hash: sessionHash };
  if (trackingCode) params.code = trackingCode;

  const res = await api.patch(`/complaints/complaints/${id}/`, data, { params });
  return res.data;
};

export const updateDeadline = async (id: string, newDate: string) => {
  const res = await api.post(`/complaints/complaints/${id}/update_deadline/`, { new_date: newDate });
  return res.data;
};

export const markComplaintAsRead = async (id: string) => {
  const res = await api.post(`/complaints/complaints/${id}/mark_read/`);
  return res.data;
};

export const upvoteComplaint = async (id: string) => {
  const res = await api.post(`/complaints/complaints/${id}/upvote/`);
  return res.data;
};

export const getDailyBriefing = async () => {
  const res = await api.get('/complaints/complaints/daily_briefing/');
  return res.data;
};

/* ===================== ANONYMOUS SESSIONS ===================== */
export interface AnonymousSession {
  session_hash: string;
  created_at: string;
  expires_at: string;
  expires_in: number;
  complaint_count: number;
  is_quota_reached: boolean;
  remaining_cooldown: number;
  cooldown_until: string | null;
  quota_reason: 'cooldown' | 'daily' | 'weekly' | null;
}

export const createAnonymousSession = async (): Promise<AnonymousSession> => {
  const res = await api.post('/complaints/session/new/');
  return res.data;
};

export const getDashboardStats = async () => {
  const res = await api.get('/complaints/complaints/dashboard_stats/');
  return res.data;
};

/* ===================== ANNOUNCEMENTS ===================== */
export interface Announcement {
  id: number;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_edited: boolean;
}

export const getAnnouncements = async (): Promise<Announcement[]> => {
  const res = await api.get('/announcements/');
  return res.data;
};

export const createAnnouncement = async (data: { title: string; content: string }) => {
  const res = await api.post('/announcements/', data);
  return res.data;
};

export const updateAnnouncement = async (id: number, data: { title: string; content: string }) => {
  const res = await api.patch(`/announcements/${id}/`, data);
  return res.data;
};

export const deleteAnnouncement = async (id: number) => {
  await api.delete(`/announcements/${id}/`);
};

/* ===================== UTILS ===================== */
export const isAuthenticated = (): boolean =>
  typeof window !== 'undefined' && !!localStorage.getItem('token');

/* ===================== NOTIFICATIONS ===================== */
export interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: 'reply' | 'status' | 'deadline' | 'escalation' | 'general';
  is_read: boolean;
  created_at: string;
  complaint?: number;
  complaint_id_str?: string;
}

/* ===================== SETTINGS ===================== */
export interface ComplaintSettings {
  id: number;
  global_max_daily: number;
  daily_limit_changes: number;
  enable_auto_freeze: boolean;
  is_frozen: boolean;
  cooldown_hours: number;
  session_hours: number;
  max_complaints_per_day: number;
  require_verification: boolean;
  auto_escalate_days: number;
  notify_principal: boolean;
  auto_unfreeze_time: string;
}

export const getSettings = async (): Promise<ComplaintSettings> => {
  const res = await api.get('/complaints/settings/');
  // The ModelViewSet list endpoint returns an array, but we single it out since there's only 1 settings object
  return Array.isArray(res.data) ? res.data[0] : res.data;
};

export const updateSettings = async (id: number, data: Partial<ComplaintSettings>): Promise<ComplaintSettings> => {
  const res = await api.patch(`/complaints/settings/${id}/`, data);
  return res.data;
};

export const getNotifications = async (): Promise<Notification[]> => {
  const res = await api.get('/complaints/notifications/');
  return res.data;
};

export const markNotificationRead = async (id: number) => {
  const res = await api.post(`/complaints/notifications/${id}/mark_read/`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.post('/complaints/notifications/mark_all_read/');
  return res.data;
};

export const deleteNotification = async (id: number) => {
  await api.delete(`/complaints/notifications/${id}/`);
};

export const deleteAllNotifications = async () => {
  const res = await api.post('/complaints/notifications/delete_all/');
  return res.data;
};
