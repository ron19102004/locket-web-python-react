import React, { useState } from 'react';
import { Heart, Mail, Lock, Loader2 } from 'lucide-react';
import { api } from '../api';

interface LoginModalProps {
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setStatusMsg('Vui lòng điền đủ email và mật khẩu');
      setIsError(true);
      return;
    }

    setLoading(true);
    setStatusMsg('Đang xác thực...');
    setIsError(false);

    try {
      const res = await api.login(email, password);
      if (res && res.ok) {
        setStatusMsg('Đăng nhập thành công!');
        setIsError(false);
        setTimeout(() => {
          onLoginSuccess();
        }, 600);
      } else {
        setStatusMsg(res?.msg || 'Đăng nhập thất bại');
        setIsError(true);
      }
    } catch (err: any) {
      setStatusMsg('Lỗi kết nối máy chủ: ' + (err.message || err));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-glass-container">
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              filter: 'drop-shadow(0 4px 18px var(--primary-glow))',
            }}
          >
            <Heart size={48} color="var(--primary)" fill="currentColor" />
          </div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.4px',
            }}
          >
            Đăng nhập Locket
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>
            Đăng nhập bằng tài khoản Locket của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-input-group">
            <label className="login-input-label">Email tài khoản</label>
            <div className="login-input-wrapper">
              <Mail className="login-input-icon" size={16} />
              <input
                type="email"
                className="login-glass-input"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="login-input-group" style={{ marginBottom: 24 }}>
            <label className="login-input-label">Mật khẩu</label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" size={16} />
              <input
                type="password"
                className="login-glass-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            className="btn-submit-glow"
            type="submit"
            disabled={loading}
            style={{ width: '100%', height: 48, fontSize: 14, fontWeight: 700 }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>

          {statusMsg && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 12,
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 600,
                background: isError ? 'rgba(255, 69, 58, 0.15)' : 'rgba(50, 215, 75, 0.15)',
                border: `1px solid ${isError ? 'rgba(255, 69, 58, 0.3)' : 'rgba(50, 215, 75, 0.3)'}`,
                color: isError ? 'var(--danger)' : 'var(--success)',
              }}
            >
              {statusMsg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

