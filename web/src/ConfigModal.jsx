import React, { useEffect, useState } from 'react';

export default function ConfigModal({ visible, onClose, onSaved, theme, language }) {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const res = await fetch('/config');
        const data = await res.json();
        setCfg(data);
      } catch (error) {
        console.error('Failed to fetch config:', error);
      }
    })();
  }, [visible]);

  if (!visible) return null;
  if (!cfg) return <div className="modal">加载中...</div>;

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/config/save', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(cfg) 
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
    }
    setSaving(false);
  };

  const bgColor = theme === 'dark' ? '#3a3a3a' : '#ffffff';
  const textColor = theme === 'dark' ? '#ffffff' : '#333333';
  const borderColor = theme === 'dark' ? '#555555' : '#dddddd';
  const inputBgColor = theme === 'dark' ? '#4a4a4a' : '#f5f5f5';
  const buttonPrimaryBg = '#1890ff';
  const buttonSecondaryBg = theme === 'dark' ? '#5a5a5a' : '#f0f0f0';

  // 根据语言设置获取文本
  const getText = (zhText, enText) => {
    return language === 'zh' ? zhText : enText;
  };

  return (
    <div style={{ 
      position: 'fixed', 
      left: 0, 
      top: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{ 
        width: '90%', 
        maxWidth: 600, 
        background: bgColor, 
        borderRadius: 12, 
        padding: '24px', 
        maxHeight: '90vh', 
        overflow: 'auto', 
        color: textColor,
        boxShadow: theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          margin: '0 0 24px 0', 
          color: textColor, 
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 600
        }}>
          {getText('全局配置', 'Global Configuration')}
        </h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            color: textColor
          }}>
            {getText('UI 端口', 'UI Port')}:
          </label>
          <input 
            value={cfg.UIPort || ''} 
            onChange={e => setCfg({ ...cfg, UIPort: parseInt(e.target.value) || 5173 })} 
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              border: `1px solid ${borderColor}`, 
              borderRadius: 8, 
              fontSize: 15, 
              background: inputBgColor, 
              color: textColor,
              boxSizing: 'border-box'
            }}
            placeholder={getText('请输入端口号', 'Enter port number')}
          />
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px',
          marginTop: '24px'
        }}>
          <button 
            onClick={onClose} 
            style={{ 
              padding: '12px 24px', 
              background: buttonSecondaryBg, 
              border: 'none', 
              borderRadius: 8, 
              cursor: 'pointer', 
              fontSize: 15, 
              color: textColor,
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            {getText('取消', 'Cancel')}
          </button>
          <button 
            onClick={save} 
            disabled={saving} 
            style={{ 
              padding: '12px 24px', 
              background: buttonPrimaryBg, 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: 8, 
              cursor: saving ? 'not-allowed' : 'pointer', 
              fontSize: 15,
              fontWeight: 500,
              opacity: saving ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {saving ? getText('保存中...', 'Saving...') : getText('保存', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}