import React, { useState } from 'react';

export default function DeleteAppModal({ visible, appName, onClose, onConfirm, theme, language }) {
  const [shouldStop, setShouldStop] = useState(false);

  if (!visible) return null;

  const handleConfirm = () => {
    onConfirm(shouldStop);
  };

  const bgColor = theme === 'dark' ? '#3a3a3a' : '#ffffff';
  const textColor = theme === 'dark' ? '#ffffff' : '#333333';
  const borderColor = theme === 'dark' ? '#555555' : '#dddddd';
  const buttonPrimaryBg = '#ff4d4f';
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
        maxWidth: 500, 
        background: bgColor, 
        borderRadius: 12, 
        padding: '24px', 
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
          {getText('删除应用', 'Delete Application')}
        </h2>
        
        <p style={{ 
          textAlign: 'center', 
          fontSize: 16, 
          color: textColor,
          marginBottom: '24px'
        }}>
          {getText('确定要删除应用', 'Are you sure you want to delete the application')} <strong style={{ color: '#ff4d4f' }}>"{appName}"</strong> {getText('吗？', '?')}
        </p>
        
        <div style={{ 
          margin: '24px 0', 
          display: 'flex', 
          justifyContent: 'center' 
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            fontWeight: 500,
            color: textColor,
            cursor: 'pointer'
          }}>
            <input 
              type="checkbox" 
              checked={shouldStop} 
              onChange={e => setShouldStop(e.target.checked)} 
              style={{ 
                width: 20, 
                height: 20, 
                marginRight: 12,
                cursor: 'pointer'
              }}
            />
            <span>{getText('删除前先停止应用', 'Stop the application before deleting')}</span>
          </label>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
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
            onClick={handleConfirm}
            style={{ 
              padding: '12px 24px', 
              background: buttonPrimaryBg, 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: 8, 
              cursor: 'pointer', 
              fontSize: 15,
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            {getText('确认删除', 'Confirm Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}