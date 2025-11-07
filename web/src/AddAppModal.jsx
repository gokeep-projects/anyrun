import React, { useState } from 'react';

export default function AddAppModal({ visible, onClose, onAdded, language }) {
  const [name, setName] = useState('');
  const [execute, setExecute] = useState('');
  const [appPath, setAppPath] = useState('');
  const [appType, setAppType] = useState('Other');
  const [daemon, setDaemon] = useState(false);
  const [args, setArgs] = useState('');
  const [autostart, setAutostart] = useState(false);
  const [timeout, setTimeout] = useState(30);

  const appTypes = ['Java', 'Python', 'NPM', 'Node.js', 'Go', 'Other'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 获取当前配置
      const res = await fetch('/api/config');
      const configData = await res.json();
      
      // 创建新的应用对象
      const newApp = {
        name,
        execute,
        appPath,
        appType,
        daemon,
        args: args.split(' ').filter(arg => arg.length > 0),
        autostart,
        timeout: parseInt(timeout)
      };
      
      // 检查应用名称是否已存在
      if (configData.apps && configData.apps.some(app => app.name === name)) {
        alert(language === 'zh' ? '应用名称已存在' : 'App name already exists');
        return;
      }
      
      // 添加到应用列表
      const updatedApps = [...(configData.apps || []), newApp];
      
      const updatedConfig = {
        ...configData,
        apps: updatedApps
      };
      
      // 保存配置
      const saveRes = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      
      if (!saveRes.ok) {
        throw new Error('Failed to save config');
      }
      
      // 重置表单
      setName('');
      setExecute('');
      setAppPath('');
      setAppType('Other');
      setDaemon(false);
      setArgs('');
      setAutostart(false);
      setTimeout(30);
      
      onClose();
      onAdded();
    } catch (error) {
      console.error('Failed to add app:', error);
      alert(`${language === 'zh' ? '添加应用失败' : 'Failed to add app'}: ${error.message}`);
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{language === 'zh' ? '添加应用' : 'Add App'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>{language === 'zh' ? '应用名称' : 'App Name'} *</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>{language === 'zh' ? '执行路径' : 'Execute Path'} *</label>
              <input
                type="text"
                className="form-control"
                value={execute}
                onChange={(e) => setExecute(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>{language === 'zh' ? '工作目录' : 'Working Directory'}</label>
              <input
                type="text"
                className="form-control"
                value={appPath}
                onChange={(e) => setAppPath(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>{language === 'zh' ? '应用类型' : 'App Type'}</label>
              <select
                className="form-control"
                value={appType}
                onChange={(e) => setAppType(e.target.value)}
              >
                {appTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>{language === 'zh' ? '启动参数' : 'Arguments'}</label>
              <input
                type="text"
                className="form-control"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder={language === 'zh' ? '以空格分隔' : 'Space separated'}
              />
            </div>
            
            <div className="form-group">
              <label>{language === 'zh' ? '超时时间(秒)' : 'Timeout (seconds)'}</label>
              <input
                type="number"
                className="form-control"
                value={timeout}
                onChange={(e) => setTimeout(e.target.value)}
                min="1"
              />
            </div>
            
            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="daemon"
                  checked={daemon}
                  onChange={(e) => setDaemon(e.target.checked)}
                />
                <label htmlFor="daemon">{language === 'zh' ? '作为守护进程运行' : 'Run as daemon'}</label>
              </div>
            </div>
            
            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="autostart"
                  checked={autostart}
                  onChange={(e) => setAutostart(e.target.checked)}
                />
                <label htmlFor="autostart">{language === 'zh' ? '开机自启动' : 'Autostart'}</label>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary">
              {language === 'zh' ? '添加' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}