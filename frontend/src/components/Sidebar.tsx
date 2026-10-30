import React from 'react';
import { Heart, Smartphone, Camera } from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentTab: 'feed' | 'post' | 'profile';
  onSelectTab: (tab: 'feed' | 'post' | 'profile') => void;
  isLoggedIn: boolean;
  userProfile: UserProfile;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isLoggedIn,
  userProfile,
}) => {
  const avatar =
    userProfile.local_avatar_url ||
    userProfile.local_avatar_b64 ||
    userProfile.profile_picture_url ||
    userProfile.profile_picture ||
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23FFCC00'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6 0-8 4-8 4v2h16v-2s-2-4-8-4z'/></svg>";

  return (
    <aside className="sidebar-compact">
      {/* Brand Logo */}
      <div
        className="sidebar-logo-btn"
        title="Locket Web"
        onClick={() => onSelectTab('feed')}
      >
        <Heart size={28} fill="currentColor" />
      </div>

      {/* Navigation Icons */}
      <div className="sidebar-icon-menu">
        <button
          className={`icon-nav-btn ${currentTab === 'feed' ? 'active' : ''}`}
          data-tooltip="Khoảnh khắc"
          onClick={() => onSelectTab('feed')}
        >
          <Smartphone size={20} />
        </button>

        <button
          className={`icon-nav-btn ${currentTab === 'post' ? 'active' : ''}`}
          data-tooltip="Đăng ảnh mới"
          onClick={() => onSelectTab('post')}
        >
          <Camera size={20} />
        </button>
      </div>

      {/* Footer Profile Avatar */}
      {isLoggedIn && (
        <div className="sidebar-compact-footer">
          <img
            className={`user-avatar-btn ${currentTab === 'profile' ? 'active' : ''}`}
            src={avatar}
            alt="Profile"
            title="Hồ sơ & Quản lý bộ nhớ"
            onClick={() => onSelectTab('profile')}
          />
        </div>
      )}
    </aside>
  );
};

