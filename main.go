package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"time"
)

//go:embed web/dist/*
var frontendFiles embed.FS

// 自定义文件系统，用于服务嵌入的前端文件
func ServeFrontend() http.Handler {
	fsys, err := fs.Sub(frontendFiles, "web/dist")
	if err != nil {
		panic(err)
	}
	
	// 使用标准的FileServer提供静态文件服务
	return http.FileServer(http.FS(fsys))
}

func main() {
	config, err := LoadConfig("anyrun.toml")
	if err != nil {
		fmt.Printf("警告: 无法加载配置文件: %v\n", err)
		config = Config{UIPort: 5173} // 使用默认配置
	}
	
	args := os.Args[1:]
	// 直接检查是否有CLI命令参数
	if len(args) >= 1 {
		// 处理-printcfg命令
		if args[0] == "-printcfg" {
			// 打印配置并退出
			b, _ := json.MarshalIndent(config, "", "  ")
			fmt.Println(string(b))
			return
		}
		// 处理status命令
		if args[0] == "status" && len(args) >= 2 {
			appName := args[1]
			found := false
			for _, app := range config.Apps {
				if app.Name == appName {
					found = true
					status := QueryStatus(app)
					b, _ := json.MarshalIndent(status, "", "  ")
					fmt.Println(string(b))
					return
				}
			}
			if !found {
				fmt.Printf("应用 '%s' 未找到\n", appName)
				os.Exit(1)
			}
			return
		}
		// 处理start命令
		if args[0] == "start" && len(args) >= 2 {
			appName := args[1]
			found := false
			for _, app := range config.Apps {
				if app.Name == appName {
					found = true
					fmt.Printf("启动应用: %s\n", app.Name)
					if err := StartApp(app); err != nil {
						fmt.Printf("启动失败: %v\n", err)
						os.Exit(1)
					}
					fmt.Printf("应用 %s 启动成功\n", app.Name)
					return
				}
			}
			if !found {
				fmt.Printf("应用 '%s' 未找到\n", appName)
				os.Exit(1)
			}
			return
		}
		// 处理stop命令
		if args[0] == "stop" && len(args) >= 2 {
			appName := args[1]
			found := false
			for _, app := range config.Apps {
				if app.Name == appName {
					found = true
					fmt.Printf("停止应用: %s\n", app.Name)
					if err := StopApp(app); err != nil {
						fmt.Printf("停止失败: %v\n", err)
						os.Exit(1)
					}
					fmt.Printf("应用 %s 停止成功\n", app.Name)
					return
				}
			}
			if !found {
				fmt.Printf("应用 '%s' 未找到\n", appName)
				os.Exit(1)
			}
			return
		}
	}
	
	// 非CLI模式：启动Web服务
		// 启动API服务器
		go func() {
			// 等待服务启动
			time.Sleep(2 * time.Second)
			// 重新加载配置以获取最新数据
			loadedConfig, err := LoadConfig("anyrun.toml")
			if err != nil {
				fmt.Printf("警告: 无法重新加载配置文件: %v\n", err)
				return
			}
			
			for _, app := range loadedConfig.Apps {
				if app.Autostart {
					fmt.Printf("自动启动应用: %s\n", app.Name)
					if err := StartApp(app); err != nil {
						fmt.Printf("启动应用 %s 失败: %v\n", app.Name, err)
					}
				}
			}
		}()
		
		// 默认启动Web服务
		StartAPIServer(config.Apps, config.UIPort)
}
}
