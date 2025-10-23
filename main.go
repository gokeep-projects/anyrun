package main

import (
	"encoding/json"
	"fmt"
	"os"
)

func main() {
	config, err := LoadConfig("anyrun.toml")
	if err != nil {
		panic(err)
	}
	args := os.Args[1:]
	for _, a := range args {
		if a == "-printcfg" {
			// 打印配置并退出
			b, _ := json.MarshalIndent(config, "", "  ")
			fmt.Println(string(b))
			return
		}
	}
	uiMode := false
	for _, arg := range args {
		if arg == "-ui" {
			uiMode = true
			break
		}
	}
	if uiMode {
		// 后端API固定监听8081，前端（UI）使用 config.UIPort（默认5173）
		StartAPIServer(config.Apps, 8081)
	} else {
		RunCLI(config.Apps)
	}
}
