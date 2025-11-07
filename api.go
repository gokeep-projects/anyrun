package main

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

var configLock sync.Mutex
var globalConfig Config
var configPath = "anyrun.toml"

func reloadConfig() {
	configLock.Lock()
	defer configLock.Unlock()
	cfg, err := LoadConfig(configPath)
	if err == nil {
		globalConfig = cfg
	} else {
		fmt.Printf("加载配置文件出错: %v\n", err)
	}
}

func saveConfig(cfg Config) error {
	configLock.Lock()
	defer configLock.Unlock()
	f, err := os.Create(configPath)
	if err != nil {
		return err
	}
	defer f.Close()
	f.WriteString(fmt.Sprintf("uiPort = %d\n\n", cfg.UIPort))
	for _, app := range cfg.Apps {
		f.WriteString("[[apps]]\n")
		f.WriteString(fmt.Sprintf("name = \"%s\"\n", app.Name))
		f.WriteString(fmt.Sprintf("execute = \"%s\"\n", app.Execute))
		f.WriteString(fmt.Sprintf("appPath = \"%s\"\n", app.AppPath))
		f.WriteString(fmt.Sprintf("appType = \"%s\"\n", app.AppType))
		f.WriteString(fmt.Sprintf("daemon = %v\n", app.Daemon))
		f.WriteString(fmt.Sprintf("args = \"%s\"\n", app.Args))
		f.WriteString(fmt.Sprintf("autostart = %v\n", app.Autostart))
		f.WriteString(fmt.Sprintf("timeout = %d\n", app.Timeout))
		f.WriteString(fmt.Sprintf("port = %d\n", app.Port))
		f.WriteString("\n")
	}
	return nil
}

// 生成密码哈希
func generatePasswordHash(password string) string {
	// 使用简单的MD5哈希（生产环境应使用更安全的方法）
	hash := md5.Sum([]byte(password))
	return hex.EncodeToString(hash[:])
}

// 验证用户登录
func authenticate(username, password string) bool {
	if globalConfig.User == nil {
		return false
	}
	if globalConfig.User.Username != username {
		return false
	}
	// 如果是首次登录，密码可以为空
	if globalConfig.User.FirstLogin && globalConfig.User.PasswordHash == "" {
		return true
	}
	return globalConfig.User.PasswordHash == generatePasswordHash(password)
}

// 认证中间件
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 登录和用户配置接口不需要认证
		if r.URL.Path == "/api/auth/login" || r.URL.Path == "/api/auth/user-config" || r.URL.Path == "/api/auth/change-password" {
			next(w, r)
			return
		}
		
		// 检查是否需要认证
		if globalConfig.User == nil || (globalConfig.User.PasswordHash == "" && !globalConfig.User.FirstLogin) {
			next(w, r)
			return
		}
		
		// 从请求头获取token
		token := r.Header.Get("Authorization")
		if token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		
		// 简单的token验证（实际应该有更复杂的机制）
		if token != "Bearer anyrun-token" {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}
		
		next(w, r)
	}
}

func StartAPIServer(apps []AppConfig, uiPort int) {
	globalConfig = Config{UIPort: uiPort, Apps: apps}
	reloadConfig()
	
	// 认证相关API
	http.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		
		var loginData struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		
		if err := json.NewDecoder(r.Body).Decode(&loginData); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		
		if authenticate(loginData.Username, loginData.Password) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success":    true,
				"token":      "anyrun-token",
				"firstLogin": globalConfig.User.FirstLogin,
			})
		} else {
			http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		}
	})
	
	// 获取用户配置
	http.HandleFunc("/api/auth/user-config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if globalConfig.User == nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"firstLogin": true,
				"username":   "admin",
			})
		} else {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"firstLogin": globalConfig.User.FirstLogin,
				"username":   globalConfig.User.Username,
			})
		}
	})
	
	// 修改密码
	http.HandleFunc("/api/auth/change-password", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		
		var passwordData struct {
			Username    string `json:"username"`
			OldPassword string `json:"oldPassword"`
			NewPassword string `json:"newPassword"`
		}
		
		if err := json.NewDecoder(r.Body).Decode(&passwordData); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		
		// 验证用户身份
		if !authenticate(passwordData.Username, passwordData.OldPassword) {
			http.Error(w, "Invalid username or old password", http.StatusUnauthorized)
			return
		}
		
		// 更新密码
		if globalConfig.User == nil {
			globalConfig.User = &UserConfig{}
		}
		globalConfig.User.Username = passwordData.Username
		globalConfig.User.PasswordHash = generatePasswordHash(passwordData.NewPassword)
		globalConfig.User.FirstLogin = false
		
		// 保存配置
		if err := saveConfig(globalConfig); err != nil {
			http.Error(w, "Failed to save config", http.StatusInternalServerError)
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
		})
	})
	
	// API路由（带认证）
	http.HandleFunc("/api/apps", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		reloadConfig()
		var statuses []AppStatus
		// 为配置中的每个应用创建状态条目，即使它们未运行
		for _, app := range globalConfig.Apps {
			status := QueryStatus(app)
			statuses = append(statuses, status)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(statuses)
	}))

	http.HandleFunc("/api/start", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.Query().Get("name")
		found := false
		reloadConfig()
		for _, app := range globalConfig.Apps {
			if app.Name == name {
				found = true
				err := StartApp(app)
				if err != nil {
					http.Error(w, fmt.Sprintf("Failed to start app '%s': %v", name, err), 500)
					return
				}
				w.Header().Set("Content-Type", "text/plain")
				w.Write([]byte("ok"))
				return
			}
		}
		if !found {
			http.Error(w, fmt.Sprintf("App '%s' not found", name), 404)
			return
		}
	})
	
	http.HandleFunc("/api/stop", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.Query().Get("name")
		found := false
		reloadConfig()
		for _, app := range globalConfig.Apps {
			if app.Name == name {
				found = true
				err := StopApp(app)
				if err != nil {
					http.Error(w, fmt.Sprintf("Failed to stop app '%s': %v", name, err), 500)
					return
				}
				w.Header().Set("Content-Type", "text/plain")
				w.Write([]byte("ok"))
				return
			}
		}
		if !found {
			http.Error(w, fmt.Sprintf("App '%s' not found", name), 404)
			return
		}
	})
	
	// 全局操作接口
	http.HandleFunc("/api/apps/startall", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		reloadConfig()
		failedApps := []string{}
		for _, app := range globalConfig.Apps {
			err := StartApp(app)
			if err != nil {
				failedApps = append(failedApps, fmt.Sprintf("%s: %v", app.Name, err))
			}
		}
		w.Header().Set("Content-Type", "text/plain")
		if len(failedApps) > 0 {
			w.WriteHeader(500)
			w.Write([]byte(fmt.Sprintf("Failed to start some apps: %v", failedApps)))
			return
		}
		w.Write([]byte("ok"))
	})
	
	http.HandleFunc("/api/apps/stopall", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		reloadConfig()
		failedApps := []string{}
		for _, app := range globalConfig.Apps {
			err := StopApp(app)
			if err != nil {
				failedApps = append(failedApps, fmt.Sprintf("%s: %v", app.Name, err))
			}
		}
		w.Header().Set("Content-Type", "text/plain")
		if len(failedApps) > 0 {
			w.WriteHeader(500)
			w.Write([]byte(fmt.Sprintf("Failed to stop some apps: %v", failedApps)))
			return
		}
		w.Write([]byte("ok"))
	})
	
	http.HandleFunc("/api/apps/restartall", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		reloadConfig()
		failedApps := []string{}
		
		// 先停止所有应用
		for _, app := range globalConfig.Apps {
			err := StopApp(app)
			if err != nil && err.Error() != "app not running" {
				failedApps = append(failedApps, fmt.Sprintf("%s (stop): %v", app.Name, err))
			}
		}
		
		// 再启动所有应用
		for _, app := range globalConfig.Apps {
			err := StartApp(app)
			if err != nil {
				failedApps = append(failedApps, fmt.Sprintf("%s (start): %v", app.Name, err))
			}
		}
		
		w.Header().Set("Content-Type", "text/plain")
		if len(failedApps) > 0 {
			w.WriteHeader(500)
			w.Write([]byte(fmt.Sprintf("Failed to restart some apps: %v", failedApps)))
			return
		}
		w.Write([]byte("ok"))
	})
	
	// 配置读取接口
	http.HandleFunc("/api/config", authMiddleware(ConfigHandler))
	
	// 配置写入接口
	http.HandleFunc("/api/config/save", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		var cfg Config
		if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
			http.Error(w, fmt.Sprintf("Failed to decode config: %v", err), 400)
			return
		}
		if err := saveConfig(cfg); err != nil {
			http.Error(w, fmt.Sprintf("Failed to save config: %v", err), 500)
			return
		}
		reloadConfig()
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte("ok"))
	})
	
	// 静态文件服务
	http.Handle("/", ServeFrontend())
	
	addr := fmt.Sprintf(":%d", uiPort)
	fmt.Printf("AnyRun服务已启动: http://localhost:%d\n", uiPort)
	http.ListenAndServe(addr, nil)
}

// ConfigHandler 处理 /api/config 请求
func ConfigHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("收到 /api/config 请求，请求方法: %s", r.Method)
	log.Printf("请求头: %v", r.Header)
	
	// 加载配置文件
	config, err := LoadConfig(configPath)
	if err != nil {
		log.Printf("加载配置文件失败: %v", err)
		http.Error(w, "加载配置文件失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	
	log.Printf("配置加载完成，UI端口: %d, 应用数量: %d", config.UIPort, len(config.Apps))
	
	// 准备响应数据，使用前端期望的字段名格式
	type AppResponse struct {
		Name     string `json:"name"`
		Execute  string `json:"execute"`
		AppPath  string `json:"appPath"`
		AppType  string `json:"appType"`
		Daemon   bool   `json:"daemon"`
		Args     string `json:"args"`
		Autostart bool  `json:"autostart"`
		Timeout  int    `json:"timeout"`
		Port     int    `json:"port"`
	}
	
	type ConfigResponse struct {
		UIPort int           `json:"uiPort"`
		Apps   []AppResponse `json:"apps"`
	}
	
	apps := make([]AppResponse, len(config.Apps))
	for i, app := range config.Apps {
		apps[i] = AppResponse{
			Name:      app.Name,
			Execute:   app.Execute,
			AppPath:   app.AppPath,
			AppType:   app.AppType,
			Daemon:    app.Daemon,
			Args:      app.Args,
			Autostart: app.Autostart,
			Timeout:   app.Timeout,
			Port:      app.Port,
		}
	}
	
	response := ConfigResponse{
		UIPort: config.UIPort,
		Apps:   apps,
	}
	
	// 编码为JSON
	data, err := json.Marshal(response)
	if err != nil {
		log.Printf("JSON编码失败: %v", err)
		http.Error(w, "JSON编码失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	
	log.Printf("JSON编码成功，数据大小: %d 字节，数据内容: %s", len(data), string(data))
	
	// 设置响应头并返回数据
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
	
	n, err := w.Write(data)
	if err != nil {
		log.Printf("返回配置信息失败: %v", err)
		return
	}
	
	log.Printf("成功返回配置信息，写入字节数: %d", n)
}
