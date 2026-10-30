export interface UserProfile {
  uid?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  local_avatar_url?: string;
  local_avatar_b64?: string;
  badge?: string;
}

export type MomentDate = 
  | number 
  | { _seconds: number; _nanoseconds?: number };

export interface Moment {
  canonical_uid: string;
  user: string;
  thumbnail_url?: string;
  video_url?: string;
  caption?: string;
  date?: MomentDate;
  local_cached_url?: string;
  local_cached_b64?: string;
  sent_to_all?: boolean;
}

export interface CacheInfo {
  file_count: number;
  size_mb: number;
  moments_count: number;
  cache_file?: string;
  cache_dir?: string;
}

export interface StatusResponse {
  logged_in: boolean;
  email: string | null;
  user_id: string | null;
  user_profile: UserProfile;
}

export interface FeedResponse {
  ok: boolean;
  msg?: string;
  data: {
    moments: Moment[];
    users: Record<string, UserProfile>;
  };
}

export interface ApiResponse<T = any> {
  ok: boolean;
  msg?: string;
  data?: T;
}

