import React, { useState, useEffect } from 'react';

export default function EditAppModal({ visible, app, onClose, onSave, theme, language }) {
  const [name, setName] = useState('');
  const [execute, setExecute] = useState('');
  const [appPath, setAppPath] = useState('');
  const [appType, setAppType] = useState('Other');
  const [daemon, setDaemon] = useState(false);
  const [args, setArgs] = useState('');
  const [autostart, setAutostart] = useState(false);
  const [timeout, setTimeout] = useState(30);

  const appTypes = ['Java', 'Python', 'NPM', 'Node.js', 'Go', 'Other'];

  useEffect(() => {
    if (app) {
      setName(app.Name || '');
      setExecute(app.Execute || '');
      setAppPath(app.Path || '');
      setAppType(app.AppType || 'Other');
      setDaemon(app.Daemon || false);
      setArgs(Array.isArray(app.Args) ? app.Args.join(' ') : (app.Args || ''));
      setAutostart(app.Autostart || false);
      setTimeout(app.Timeout || 30);
    }
  }, [app]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const updatedApp = {
      Name: name,
      Execute: execute,
      Path: appPath,
      AppType: appType,
      Daemon: daemon,
      Args: args.split(' ').filter(arg => arg.length > 0),
      Autostart: autostart,
      Timeout: parseInt(timeout)
    };
    
    onSave(updatedApp);
  };

  if (!visible || !app) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{language === 'zh' ? '编辑应用' : 'Edit App'}</h3>
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
              {language === 'zh' ? '保存' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}