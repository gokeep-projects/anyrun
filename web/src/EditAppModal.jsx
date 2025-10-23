import React, { useState, useEffect } from 'react';

export default function EditAppModal({ visible, app, onClose, onSave, theme, language }) {
  const [editingApp, setEditingApp] = useState({
    Name: '',
    Execute: '',
    AppPath: '',
    AppType: 'java',
    Daemon: false,
    Args: '',
    Autostart: false,
    Timeout: 60 // 将默认超时时间改为60秒
  });
  const [shouldRestart, setShouldRestart] = useState(false); // 默认不重启应用

  // 当app属性改变时，更新editingApp状态
  useEffect(() => {
    if (app) {
      setEditingApp({
        Name: app.Name || '',
        Execute: app.Execute || '',
        AppPath: app.AppPath || '',
        AppType: app.AppType || 'java',
        Daemon: app.Daemon || false,
        Args: app.Args || '',
        Autostart: app.Autostart || false,
        Timeout: app.Timeout || 60
      });
    } else {
      setEditingApp({
        Name: '',
        Execute: '',
        AppPath: '',
        AppType: 'java',
        Daemon: false,
        Args: '',
        Autostart: false,
        Timeout: 60
      });
    }
  }, [app]);

  const updateField = (key, value) => {
    setEditingApp({ ...editingApp, [key]: value });
  };

  if (!visible) return null;

  const handleSave = () => {
    onSave(editingApp, shouldRestart);
  };

  const appTypes = [
    { value: 'java', label: 'Java' },
    { value: 'python', label: 'Python' },
    { value: 'npm', label: 'NPM' },
    { value: 'node', label: 'Node.js' },
    { value: 'go', label: language === 'zh' ? '其它' : 'Other' }
  ];

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
        maxWidth: 700, 
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
          {app ? getText('编辑应用', 'Edit Application') : getText('新增应用', 'Add Application')}
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 500,
              color: textColor
            }}>
              {getText('应用名称', 'App Name')}
            </label>
            <input 
              value={editingApp.Name} 
              onChange={e => updateField('Name', e.target.value)} 
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
              placeholder={getText('请输入应用名称', 'Enter app name')}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 500,
              color: textColor
            }}>
              {getText('应用类型', 'App Type')}
            </label>
            <select
              value={editingApp.AppType}
              onChange={e => updateField('AppType', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                border: `1px solid ${borderColor}`, 
                borderRadius: 8, 
                fontSize: 15, 
                background: inputBgColor, 
                color: textColor,
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            >
              {appTypes.map(type => (
                <option 
                  key={type.value} 
                  value={type.value} 
                  style={{ background: inputBgColor, color: textColor }}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 500,
              color: textColor
            }}>
              {getText('执行命令', 'Execute Command')}
            </label>
            <input 
              value={editingApp.Execute} 
              onChange={e => updateField('Execute', e.target.value)} 
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
              placeholder="java|python|npm|/path/to/bin"
            />
          </div>
          
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 500,
              color: textColor
            }}>
              {getText('应用路径', 'App Path')}
            </label>
            <input 
              value={editingApp.AppPath} 
              onChange={e => updateField('AppPath', e.target.value)} 
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
              placeholder={getText('应用所在路径', 'Application path')}
            />
          </div>
          
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 500,
              color: textColor
            }}>
              {getText('参数', 'Arguments')}
            </label>
            <input 
              value={editingApp.Args} 
              onChange={e => updateField('Args', e.target.value)} 
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
              placeholder={getText('执行参数', 'Execution arguments')}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontWeight: 500,
              color: textColor,
              cursor: 'pointer'
            }}>
              <input 
                type="checkbox" 
                checked={editingApp.Daemon} 
                onChange={e => updateField('Daemon', e.target.checked)} 
                style={{ 
                  width: 20, 
                  height: 20, 
                  marginRight: 12,
                  cursor: 'pointer'
                }}
              />
              <span>{getText('后台运行(Daemon)', 'Run as Daemon')}</span>
            </label>
          </div>
          
          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontWeight: 500,
              color: textColor,
              cursor: 'pointer'
            }}>
              <input 
                type="checkbox" 
                checked={editingApp.Autostart} 
                onChange={e => updateField('Autostart', e.target.checked)} 
                style={{ 
                  width: 20, 
                  height: 20, 
                  marginRight: 12,
                  cursor: 'pointer'
                }}
              />
              <span>{getText('开机自启动', 'Auto Start on Boot')}</span>
            </label>
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 500,
              color: textColor
            }}>
              {getText('超时时间(秒)', 'Timeout (seconds)')}
            </label>
            <input 
              type="number"
              value={editingApp.Timeout || ''} 
              onChange={e => updateField('Timeout', parseInt(e.target.value) || 60)} 
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
              placeholder={getText('超时时间', 'Timeout')}
            />
          </div>
          
          {app && (
            <div>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontWeight: 500,
                color: textColor,
                cursor: 'pointer'
              }}>
                <input 
                  type="checkbox" 
                  checked={shouldRestart} 
                  onChange={e => setShouldRestart(e.target.checked)} 
                  style={{ 
                    width: 20, 
                    height: 20, 
                    marginRight: 12,
                    cursor: 'pointer'
                  }}
                />
                <span>{getText('保存后重启应用', 'Restart app after saving')}</span>
              </label>
            </div>
          )}
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px',
          marginTop: '12px'
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
            onClick={handleSave}
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
            {getText('保存', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}