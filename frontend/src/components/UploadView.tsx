import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import { api } from '../api';

interface UploadViewProps {
  onSuccess: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatusMsg({ text: 'Vui lòng chọn một tệp hình ảnh!', isError: true });
      return;
    }
    setSelectedFile(file);
    setStatusMsg(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handlePublish = async () => {
    if (!selectedFile) {
      setStatusMsg({ text: 'Vui lòng chọn ảnh trước!', isError: true });
      return;
    }

    setIsPosting(true);
    setStatusMsg(null);

    try {
      const res = await api.postMoment(selectedFile, caption, sendToAll);
      if (res && res.ok) {
        setStatusMsg({ text: '✅ Đăng khoảnh khắc thành công!', isError: false });
        setTimeout(() => {
          setSelectedFile(null);
          setPreviewUrl(null);
          setCaption('');
          onSuccess();
        }, 800);
      } else {
        setStatusMsg({ text: `❌ ${res?.msg || 'Không thể đăng moment'}`, isError: true });
      }
    } catch (err: any) {
      setStatusMsg({ text: `❌ Lỗi: ${err.message || err}`, isError: true });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="upload-view-wrapper">
      <div className="upload-glass-card">
        <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Camera size={24} color="var(--primary)" />
          Đăng Khoảnh Khắc Lên Widget
        </h2>

        <div className="upload-grid-box">
          {/* File Picker & 1:1 Preview */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {!previewUrl ? (
              <div
                className="upload-drop-area"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <ImageIcon size={44} color="var(--primary)" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  Chọn ảnh từ máy tính
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Kéo thả hoặc bấm để duyệt (chuẩn 1:1 Locket)
                </div>
              </div>
            ) : (
              <div
                className="preview-box-1x1"
                onClick={() => fileInputRef.current?.click()}
                title="Bấm để chọn ảnh khác"
              >
                <img src={previewUrl} alt="Preview" />
              </div>
            )}
          </div>

          {/* Caption & Controls */}
          <div>
            <label className="input-label">Chú thích khoảnh khắc:</label>
            <textarea
              className="liquid-textarea"
              placeholder="Viết cảm nghĩ hoặc lời nhắn của bạn..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
            />

            <div style={{ margin: '18px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="sendAllCheck"
                checked={sendToAll}
                onChange={(e) => setSendToAll(e.target.checked)}
                style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
              />
              <label htmlFor="sendAllCheck" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Gửi đến Widget tất cả bạn bè
              </label>
            </div>

            <button
              className="btn-submit-glow"
              disabled={isPosting || !selectedFile}
              onClick={handlePublish}
            >
              {isPosting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang xuất bản...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Đăng lên Widget ngay</span>
                </>
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
                  background: statusMsg.isError ? 'rgba(255, 69, 58, 0.15)' : 'rgba(50, 215, 75, 0.15)',
                  border: `1px solid ${statusMsg.isError ? 'rgba(255, 69, 58, 0.3)' : 'rgba(50, 215, 75, 0.3)'}`,
                  color: statusMsg.isError ? 'var(--danger)' : 'var(--success)',
                }}
              >
                {statusMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

