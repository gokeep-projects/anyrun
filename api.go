package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
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

func StartAPIServer(apps []AppConfig, uiPort int) {
	globalConfig = Config{UIPort: uiPort, Apps: apps}
	reloadConfig()
	http.HandleFunc("/apps", func(w http.ResponseWriter, r *http.Request) {
		reloadConfig()
		var statuses []AppStatus
		// 为配置中的每个应用创建状态条目，即使它们未运行
		for _, app := range globalConfig.Apps {
			status := QueryStatus(app)
			statuses = append(statuses, status)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(statuses)
	})
	http.HandleFunc("/start", func(w http.ResponseWriter, r *http.Request) {
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
	http.HandleFunc("/stop", func(w http.ResponseWriter, r *http.Request) {
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
	http.HandleFunc("/apps/startall", func(w http.ResponseWriter, r *http.Request) {
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
	http.HandleFunc("/apps/stopall", func(w http.ResponseWriter, r *http.Request) {
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
	http.HandleFunc("/apps/restartall", func(w http.ResponseWriter, r *http.Request) {
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
	http.HandleFunc("/config", func(w http.ResponseWriter, r *http.Request) {
		reloadConfig()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(globalConfig)
	})
	// 配置写入接口
	http.HandleFunc("/config/save", func(w http.ResponseWriter, r *http.Request) {
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
	addr := fmt.Sprintf(":%d", uiPort)
	fmt.Printf("管理页面API服务已启动: http://localhost:%d\n", uiPort)
	http.ListenAndServe(addr, nil)
}