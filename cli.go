package main

import (
	"fmt"
	"os"
	"strings"
	"time"
)

func RunCLI(apps []AppConfig) {
	for {
		fmt.Print("anyrun> ")
		var input string
		fmt.Scanln(&input)
		args := strings.Fields(input)
		if len(args) == 0 {
			continue
		}
		switch args[0] {
		case "start":
			for _, app := range apps {
				if len(args) == 2 && app.Name != args[1] {
					continue
				}
				err := StartApp(app)
				if err != nil {
					fmt.Println("启动失败:", app.Name, err)
				} else {
					fmt.Println("启动成功:", app.Name)
				}
			}
		case "stop":
			for _, app := range apps {
				if len(args) == 2 && app.Name != args[1] {
					continue
				}
				err := StopApp(app)
				if err != nil {
					fmt.Println("停止失败:", app.Name, err)
				} else {
					fmt.Println("停止成功:", app.Name)
				}
			}
		case "status":
			fmt.Printf("%-12s %-8s %-10s %-30s %-10s\n", "Name", "PID", "Type", "Path", "Status")
			for _, app := range apps {
				st := QueryStatus(app)
				color := "\033[31m"
				if st.Status == "running" {
					color = "\033[32m"
				}
				fmt.Printf("%-12s %-8d %-10s %-30s %s%-10s\033[0m\n", st.Name, st.PID, app.AppType, st.Path, color, st.Status)
			}
		case "exit":
			os.Exit(0)
		default:
			fmt.Println("命令支持: start [name], stop [name], status, exit")
		}
		time.Sleep(500 * time.Millisecond)
	}
}
