import React, { useState } from 'react';
import { ArrowLeft, Users, Images, Copy, Database, Trash2, CloudDownload, LogOut, Check } from 'lucide-react';
import { UserProfile, CacheInfo } from '../types';
import { api } from '../api';

interface ProfileViewProps {
  userProfile: UserProfile;
  cacheInfo: CacheInfo;
  momentsCount: number;
  onBackToFeed: () => void;
  onRefreshFeed: (forceRefresh?: boolean) => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userProfile,
  cacheInfo,
  momentsCount,
  onBackToFeed,
  onRefreshFeed,
  onLogout,
}) => {
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);

  const avatar =
    userProfile.local_avatar_url ||
    userProfile.local_avatar_b64 ||
    userProfile.profile_picture_url ||
    userProfile.profile_picture ||
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23FFCC00'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6 0-8 4-8 4v2h16v-2s-2-4-8-4z'/></svg>";

  const fullName =
    `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() ||
    userProfile.username ||
    'Người dùng Locket';

  const handleCopyUid = () => {
    if (userProfile.uid) {
      navigator.clipboard.writeText(userProfile.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ ảnh trong cache và đặt lại dữ liệu?')) {
      setClearing(true);
      try {
        const res = await api.clearCache();
        if (res && res.ok) {
          alert('✅ Đã dọn sạch bộ nhớ đệm cache!');
          onRefreshFeed(true);
        } else {
          alert('Lỗi: ' + (res?.msg || 'Không thể xóa'));
        }
      } catch (err: any) {
        alert('Lỗi: ' + err.message);
      } finally {
        setClearing(false);
      }
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?')) {
      onLogout();
    }
  };

  return (
    <div className="profile-view-wrapper">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header-row">
          <button className="btn-back-pill" onClick={onBackToFeed}>
            <ArrowLeft size={16} />
            <span>Quay lại khoảnh khắc</span>
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)' }}>
            HỒ SƠ CÁ NHÂN
          </div>
        </div>

        {/* Card 1: User Profile Info */}
        <div className="profile-user-card">
          <img className="profile-large-avatar" src={avatar} alt="Avatar" />
          <div className="profile-user-info" style={{ flex: 1 }}>
            <h2>{fullName}</h2>
            <div className="profile-user-handle">
              @{userProfile.username || 'locket_user'}
            </div>

            <div className="profile-stat-pills">
              <div className="stat-pill">
                <Users size={14} color="var(--primary)" />
                Bạn bè Locket
              </div>
              <div className="stat-pill">
                <Images size={14} color="var(--primary)" />
                {momentsCount} Khoảnh khắc đã lưu
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-dim)',
                  fontFamily: 'monospace',
                }}
              >
                UID: {userProfile.uid || '---'}
              </div>
              <button
                onClick={handleCopyUid}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copied ? 'var(--success)' : 'var(--primary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Sao chép UID"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span style={{ fontSize: 11 }}>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Cache Management */}
        <div className="profile-section-card">
          <div className="section-card-title">
            <Database size={18} color="var(--primary)" />
            <span>Quản Lý Bộ Nhớ Đệm Cục Bộ (Cache)</span>
          </div>

          <div className="cache-info-box">
            <div>
              📊 <strong>Hiện trạng:</strong> {cacheInfo.file_count} tệp ảnh đã lưu (
              {cacheInfo.size_mb} MB) • {cacheInfo.moments_count} bản ghi khoảnh khắc.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
              Ảnh được lưu trữ trực tiếp trên máy chủ để tăng tốc độ lướt tức thì và hỗ trợ xem offline.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="btn-danger-glass"
              onClick={handleClearCache}
              disabled={clearing}
            >
              <Trash2 size={16} />
              <span>{clearing ? 'Đang dọn...' : 'Xóa toàn bộ ảnh cached & file cache JSON'}</span>
            </button>

            <button className="btn-secondary-glass" onClick={() => onRefreshFeed(true)}>
              <CloudDownload size={16} />
              <span>Tải lại đầy đủ từ Locket</span>
            </button>
          </div>
        </div>

        {/* Card 3: Account & Logout */}
        <div
          className="profile-section-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Đăng xuất khỏi thiết bị</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              Xóa phiên đăng nhập, dọn sạch cache và trở về màn hình đăng nhập.
            </div>
          </div>

          <button className="btn-danger-glass" onClick={handleLogoutClick}>
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};

