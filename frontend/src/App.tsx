import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { FeedView } from './components/FeedView';
import { UploadView } from './components/UploadView';
import { ProfileView } from './components/ProfileView';
import { LoginModal } from './components/LoginModal';
import { api } from './api';
import { UserProfile, Moment, CacheInfo } from './types';

export function App() {
  const [tab, setTab] = useState<'feed' | 'post' | 'profile'>('feed');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [moments, setMoments] = useState<Moment[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [selectedUser, setSelectedUser] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({
    file_count: 0,
    size_mb: 0,
    moments_count: 0,
  });

  const fetchCacheInfo = useCallback(async () => {
    try {
      const info = await api.getCacheInfo();
      if (info) setCacheInfo(info);
    } catch (e) {
      console.error('Fetch cache info error:', e);
    }
  }, []);

  const loadFeed = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const res = await api.getFeed(forceRefresh);
      if (res && res.ok && res.data) {
        setMoments(res.data.moments || []);
        setUsers(res.data.users || {});
      }
      fetchCacheInfo();
    } catch (err) {
      console.error('Load feed error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchCacheInfo]);

  const initApp = useCallback(async () => {
    try {
      const status = await api.getStatus();
      if (status && status.logged_in) {
        setIsLoggedIn(true);
        setUserProfile(status.user_profile || {});
        loadFeed(false);
        fetchCacheInfo();
      } else {
        setIsLoggedIn(false);
        setUserProfile({});
        setMoments([]);
        setUsers({});
      }
    } catch (err) {
      console.error('Init error:', err);
    }
  }, [loadFeed, fetchCacheInfo]);

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Periodic background feed sync every 45s
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      loadFeed(false);
    }, 45000);
    return () => clearInterval(interval);
  }, [isLoggedIn, loadFeed]);

  const handleLogout = async () => {
    try {
      await api.logout();
      setIsLoggedIn(false);
      setUserProfile({});
      setMoments([]);
      setUsers({});
      setSelectedUser('');
      setActiveIndex(0);
      setCacheInfo({ file_count: 0, size_mb: 0, moments_count: 0 });
      setTab('feed');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      {/* Ambient Aurora Gradient Orbs */}
      <div className="aurora-bg">
        <div className="aurora-blob blob-amber"></div>
        <div className="aurora-blob blob-violet"></div>
      </div>

      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
        {/* Sidebar */}
        <Sidebar
          currentTab={tab}
          onSelectTab={setTab}
          isLoggedIn={isLoggedIn}
          userProfile={userProfile}
        />

        {/* Main Workspace */}
        <main className="main-workspace">
          {tab === 'feed' ? (
            <FeedView
              moments={moments}
              users={users}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              loading={loading}
              onRefreshFeed={loadFeed}
            />
          ) : tab === 'post' ? (
            <UploadView
              onSuccess={() => {
                setTab('feed');
                loadFeed(false);
              }}
            />
          ) : (
            <ProfileView
              userProfile={userProfile}
              cacheInfo={cacheInfo}
              momentsCount={moments.length}
              onBackToFeed={() => setTab('feed')}
              onRefreshFeed={loadFeed}
              onLogout={handleLogout}
            />
          )}
        </main>

        {/* Login Modal */}
        {!isLoggedIn && (
          <LoginModal
            onLoginSuccess={() => {
              initApp();
            }}
          />
        )}
      </div>
    </>
  );
}
export default App;

