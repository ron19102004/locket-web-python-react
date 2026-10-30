import { StatusResponse, FeedResponse, CacheInfo, ApiResponse } from './types';

const API_BASE = '/api';

export const api = {
  async getStatus(): Promise<StatusResponse> {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
  },

  async login(email: string, password: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async logout(): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
    });
    return res.json();
  },

  async getFeed(forceRefresh = false): Promise<FeedResponse> {
    const res = await fetch(`${API_BASE}/feed?force_refresh=${forceRefresh}`);
    if (!res.ok) throw new Error('Failed to fetch feed');
    return res.json();
  },

  async getCacheInfo(): Promise<CacheInfo> {
    const res = await fetch(`${API_BASE}/cache_info`);
    if (!res.ok) throw new Error('Failed to fetch cache info');
    return res.json();
  },

  async clearCache(): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE}/clear_cache`, {
      method: 'POST',
    });
    return res.json();
  },

  async postMoment(file: File, caption: string, sentToAll: boolean): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('caption', caption);
    formData.append('sent_to_all', String(sentToAll));

    const res = await fetch(`${API_BASE}/post_moment`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async deleteMoment(momentUid: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE}/delete_moment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moment_uid: momentUid }),
    });
    return res.json();
  },

  async changeProfile(firstName?: string, lastName?: string, badge?: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE}/change_profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        badge: badge,
      }),
    });
    return res.json();
  }
};

