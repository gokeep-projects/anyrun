package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type AppConfig struct {
	Name      string `json:"name"`
	Execute   string `json:"execute"`   // 可执行器，例如: java, python, npm, /usr/bin/myprog
	AppPath   string `json:"appPath"`   // 应用路径或脚本文件
	AppType   string `json:"appType"`   // 应用类型：java|python|node|other
	Daemon    bool   `json:"daemon"`
	Args      string `json:"args"`
	Autostart bool   `json:"autostart"`
	Timeout   int    `json:"timeout"`
	Port      int    `json:"port"` // 应用监听的端口
}

type UserConfig struct {
	Username       string `json:"username"`
	PasswordHash   string `json:"passwordHash"`
	FirstLogin     bool   `json:"firstLogin"`
}

type Config struct {
	UIPort int        `json:"uiPort"`
	Apps   []AppConfig `json:"apps"`
	User   *UserConfig `json:"user,omitempty"`
}

// 简易TOML解析，支持全局 ui_port 与多个 [[apps]]
func LoadConfig(path string) (Config, error) {
	fmt.Printf("开始加载配置文件: %s\n", path)
	
	// 首先尝试加载当前目录的配置文件
	if _, err := os.Stat("anyrun.toml"); err == nil {
		path = "anyrun.toml"
		fmt.Printf("使用当前目录配置文件: %s\n", path)
	} else {
		// 如果当前目录没有配置文件，尝试加载/etc/anyrun/anyrun.toml (Unix系统)
		if _, err := os.Stat("/etc/anyrun/anyrun.toml"); err == nil {
			path = "/etc/anyrun/anyrun.toml"
			fmt.Printf("使用系统目录配置文件: %s\n", path)
		}
	}
		data, err := os.ReadFile(path)
	if err != nil {
		fmt.Printf("读取配置文件失败: %v\n", err)
		// 返回默认配置，包括用户配置
		return Config{
			UIPort: 5173,
			Apps:   []AppConfig{},
			User:   &UserConfig{Username: "admin", PasswordHash: "", FirstLogin: true},
		}, err
	}
	
	fmt.Printf("配置文件读取成功，大小: %d 字节\n", len(data))
	lines := strings.Split(string(data), "\n")
	var apps []AppConfig
	var app *AppConfig = nil
	cfg := Config{UIPort: 5173}
	var inUserSection bool
	cfg.User = &UserConfig{FirstLogin: true}
	
	for i, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		
		// 用户配置区域
		if strings.HasPrefix(line, "[user]") {
			inUserSection = true
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
					fmt.Printf("解析到UI端口: %d\n", p)
				} else {
					fmt.Printf("解析UI端口失败: %v\n", err)
				}
			}
			continue
		}
		
		if line == "[[apps]]" {
			inUserSection = false
			if app != nil && app.Name != "" {
				fmt.Printf("添加应用: %s\n", app.Name)
				apps = append(apps, *app)
			}
			app = &AppConfig{}
			continue
		}
		
		if app == nil {
			// 检查是否在用户配置区域
			if inUserSection {
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
				case "username":
					cfg.User.Username = val
				case "passwordHash":
					cfg.User.PasswordHash = val
				case "firstLogin":
					cfg.User.FirstLogin = (val == "true" || val == "True" || val == "TRUE" || val == "1")
				default:
					fmt.Printf("未知用户配置项在第%d行: %s=%s\n", i+1, key, val)
				}
			}
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
			if t, err := strconv.Atoi(val); err == nil {
				app.Timeout = t
			}
		case "port":
			if p, err := strconv.Atoi(val); err == nil {
				app.Port = p
			}
		default:
			fmt.Printf("未知配置项在第%d行: %s=%s\n", i+1, key, val)
		}
	}
	
	if app != nil && app.Name != "" {
		fmt.Printf("添加最后一个应用: %s\n", app.Name)
		apps = append(apps, *app)
	}
	
	cfg.Apps = apps
	fmt.Printf("配置加载完成，共加载 %d 个应用\n", len(apps))
	return cfg, nil
}