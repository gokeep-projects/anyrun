package main

import (
	"os"
	"strconv"
	"strings"
)

type AppConfig struct {
	Name      string
	Execute   string // 可执行器，例如: java, python, npm, /usr/bin/myprog
	AppPath   string // 应用路径或脚本文件
	AppType   string // 应用类型：java|python|node|other
	Daemon    bool
	Args      string
	Autostart bool
	Timeout   int
	Port      int // 应用监听的端口
}
type Config struct {
	UIPort int
	Apps   []AppConfig
}

// 简易TOML解析，支持全局 ui_port 与多个 [[apps]]
func LoadConfig(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, err
	}
	lines := strings.Split(string(data), "\n")
	var apps []AppConfig
	var app *AppConfig = nil
	cfg := Config{UIPort: 5173}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// 全局 uiPort (驼峰或下划线都支持)
		if strings.HasPrefix(line, "uiPort") || strings.HasPrefix(line, "ui_port") {
			kv := strings.SplitN(line, "=", 2)
			if len(kv) == 2 {
				portStr := strings.TrimSpace(kv[1])
				portStr = strings.Trim(portStr, "\"")
				if p, err := strconv.Atoi(portStr); err == nil {
					cfg.UIPort = p
				}
			}
			continue
		}
		if line == "[[apps]]" {
			if app != nil && app.Name != "" {
				apps = append(apps, *app)
			}
			app = &AppConfig{}
			continue
		}
		if app == nil {
			continue
		}
		kv := strings.SplitN(line, "=", 2)
		if len(kv) != 2 {
			continue
		}
		key := strings.TrimSpace(kv[0])
		val := strings.TrimSpace(kv[1])
		// 去除引号
		if strings.HasPrefix(val, "\"") && strings.HasSuffix(val, "\"") {
			val = strings.Trim(val, "\"")
		}
		switch key {
		case "name":
			app.Name = val
		case "execute":
			app.Execute = val
		case "appPath", "app_path":
			app.AppPath = val
		case "appType", "app_type":
			app.AppType = val
		case "daemon":
			app.Daemon = (val == "true" || val == "True" || val == "TRUE" || val == "1")
		case "args":
			app.Args = val
		case "autostart":
			app.Autostart = (val == "true" || val == "True" || val == "TRUE" || val == "1")
		case "timeout":
			app.Timeout, _ = strconv.Atoi(val)
		case "port":
			app.Port, _ = strconv.Atoi(val)
		}
	}
	if app != nil && app.Name != "" {
		apps = append(apps, *app)
	}
	cfg.Apps = apps
	return cfg, nil
}