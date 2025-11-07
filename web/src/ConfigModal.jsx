import React, { useState, useEffect } from 'react';

export default function ConfigModal({ visible, onClose, onSaved, theme, language }) {
  const [config, setConfig] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadConfig();
    }
  }, [visible]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/raw');
      const text = await res.text();
      setConfig(text);
    } catch (error) {
      console.error('Failed to load config:', error);
      alert(`${language === 'zh' ? '加载配置失败' : 'Failed to load config'}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config/save/raw', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: config
      });
      
      if (!res.ok) {
        throw new Error('Failed to save config');
      }
      
      onClose();
      onSaved();
    } catch (error) {
      console.error('Failed to save config:', error);
      alert(`${language === 'zh' ? '保存配置失败' : 'Failed to save config'}: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3>{language === 'zh' ? '配置文件' : 'Configuration'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <p>{language === 'zh' ? '加载中...' : 'Loading...'}</p>
          ) : (
            <div className="form-group">
              <label>{language === 'zh' ? '配置内容' : 'Config Content'}</label>
              <textarea
                className="form-control"
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                rows={20}
                style={{ fontFamily: 'monospace', fontSize: '14px' }}
              />
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (language === 'zh' ? '保存中...' : 'Saving...') : (language === 'zh' ? '保存' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
