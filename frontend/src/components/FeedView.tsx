import React, { useRef, useEffect } from 'react';
import { Filter, RefreshCw, Download, ChevronUp, ChevronDown, Camera } from 'lucide-react';
import { Moment, UserProfile, MomentDate } from '../types';

interface FeedViewProps {
  moments: Moment[];
  users: Record<string, UserProfile>;
  selectedUser: string;
  onSelectUser: (uid: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  loading: boolean;
  onRefreshFeed: (forceRefresh?: boolean) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  moments,
  users,
  selectedUser,
  onSelectUser,
  activeIndex,
  setActiveIndex,
  loading,
  onRefreshFeed,
}) => {
  const streamRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Filter moments
  const filteredMoments = selectedUser
    ? moments.filter((m) => m.user === selectedUser)
    : moments;

  // Setup IntersectionObserver for mobile stream snapping
  useEffect(() => {
    if (!streamRef.current || filteredMoments.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const idx = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            if (!isNaN(idx)) {
              setActiveIndex(idx);
            }
          }
        });
      },
      {
        root: streamRef.current,
        threshold: [0.5, 0.75],
      }
    );

    const cards = streamRef.current.querySelectorAll('.moment-card');
    cards.forEach((c) => observer.observe(c));

    return () => observer.disconnect();
  }, [filteredMoments, setActiveIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredMoments.length === 0) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') {
        scrollToCard(Math.min(activeIndex + 1, filteredMoments.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') {
        scrollToCard(Math.max(activeIndex - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredMoments, activeIndex]);

  const scrollToCard = (index: number) => {
    setActiveIndex(index);
    if (cardsRef.current[index]) {
      cardsRef.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDownload = async (url?: string, filename?: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || `locket_moment_${Date.now()}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: direct download link opening
      window.open(url, '_blank');
    }
  };

  const formatTime = (dateField?: MomentDate) => {
    if (!dateField) return '--:--';
    let ts: number;
    if (typeof dateField === 'object' && '_seconds' in dateField) {
      ts = dateField._seconds * 1000;
    } else {
      ts = Number(dateField);
    }
    if (ts < 1e11) ts *= 1000;

    const diffSec = Math.floor((Date.now() - ts) / 1000);
    const d = new Date(ts);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    if (diffSec < 60) return `Vừa xong (${timeStr})`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước (${timeStr})`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước (${timeStr})`;
    return `${timeStr} • ${dateStr}`;
  };

  const emojis = ['❤️', '🔥', '😂', '😍', '👍', '🎉'];

  return (
    <div className="stream-container">
      {/* Top Filter Bar */}
      <div className="feed-filter-bar">
        <div className="filter-select-container">
          <Filter size={16} color="var(--primary)" />
          <select
            className="liquid-select"
            value={selectedUser}
            onChange={(e) => {
              onSelectUser(e.target.value);
              setActiveIndex(0);
              if (cardsRef.current[0]) {
                cardsRef.current[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          >
            <option value="">Tất cả bạn bè ({moments.length} khoảnh khắc)</option>
            {Object.values(users).map((u) => {
              const uName =
                `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
                u.username ||
                'Bạn bè';
              const uCount = moments.filter((m) => m.user === u.uid).length;
              return (
                <option key={u.uid} value={u.uid}>
                  {uName} {u.username ? `(@${u.username})` : ''} • {uCount} ảnh
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn-sync-glass"
            onClick={() => onRefreshFeed(true)}
            disabled={loading}
            title="Đồng bộ khoảnh khắc mới nhất từ máy chủ Locket"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Đang đồng bộ...' : 'Đồng bộ mới'}</span>
          </button>
          <div className="filter-count-badge">
            {filteredMoments.length} khoảnh khắc
          </div>
        </div>
      </div>

      {/* Stream Scroll Viewport */}
      <div className="stream-scroll-viewport" ref={streamRef}>
        {filteredMoments.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 120, color: 'var(--text-muted)' }}>
            <Camera size={48} color="var(--primary)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 6 }}>
              Chưa có khoảnh khắc nào
            </h3>
            <p style={{ fontSize: 13 }}>
              Hãy kết bạn trên Locket hoặc chọn Tất cả bạn bè để xem ảnh!
            </p>
          </div>
        ) : (
          filteredMoments.map((m, idx) => {
            const u = users[m.user] || {};
            const authorName =
              `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
              u.username ||
              'Bạn bè';
            const username = u.username ? `@${u.username}` : '';
            const avatar =
              u.local_avatar_url ||
              u.local_avatar_b64 ||
              u.profile_picture_url ||
              u.profile_picture ||
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23666'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6 0-8 4-8 4v2h16v-2s-2-4-8-4z'/></svg>";

            const imgSrc =
              m.local_cached_url ||
              m.local_cached_b64 ||
              m.thumbnail_url ||
              m.video_url ||
              '';

            return (
              <div
                key={m.canonical_uid || idx}
                className="moment-card"
                data-index={idx}
                ref={(el) => (cardsRef.current[idx] = el)}
              >
                {/* Top Author Bar */}
                <div className="card-top">
                  <div
                    className="author-box"
                    onClick={() => onSelectUser(m.user)}
                    title="Lọc khoảnh khắc của người này"
                  >
                    <img className="author-avatar" src={avatar} alt="" />
                    <div>
                      <div className="author-title">{authorName}</div>
                      <div className="author-time">
                        {formatTime(m.date)} {username ? `• ${username}` : ''}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--primary)',
                      background: 'rgba(255,204,0,0.12)',
                      padding: '2px 8px',
                      borderRadius: 9999,
                    }}
                  >
                    #{idx + 1}
                  </div>
                </div>

                {/* 1:1 Squircle Photo Frame */}
                <div className="photo-frame-1x1">
                  <img src={imgSrc} alt="Moment" loading="lazy" />
                  {m.caption && m.caption.trim() && (
                    <div className="floating-caption">{m.caption}</div>
                  )}
                </div>

                {/* Bottom Bar: Reactions & Download */}
                <div className="card-bottom">
                  <div className="reactions-row">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        className="btn-emoji-react"
                        onClick={(e) => {
                          const target = e.currentTarget;
                          target.style.transform = 'scale(1.5)';
                          setTimeout(() => {
                            target.style.transform = '';
                          }, 250);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <button
                    className="btn-download-glass"
                    onClick={() =>
                      handleDownload(
                        m.thumbnail_url || m.video_url || imgSrc,
                        `locket_${m.canonical_uid}.webp`
                      )
                    }
                    title="Lưu ảnh về máy tính"
                  >
                    <Download size={14} />
                    <span>Lưu ảnh</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Navigation Controls */}
      <div className="floating-nav-panel">
        <button
          className="circle-action-btn"
          title="Cuộn lên"
          onClick={() => scrollToCard(Math.max(activeIndex - 1, 0))}
        >
          <ChevronUp size={20} />
        </button>
        <button
          className="circle-action-btn"
          title="Cuộn xuống"
          onClick={() =>
            scrollToCard(Math.min(activeIndex + 1, filteredMoments.length - 1))
          }
        >
          <ChevronDown size={20} />
        </button>
        <button
          className="circle-action-btn"
          title="Làm mới (Đồng bộ khoảnh khắc mới)"
          onClick={() => onRefreshFeed(false)}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
};

