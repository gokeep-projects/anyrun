package main

import (
	"fmt"
	"os/exec"
	"strings"
	"syscall"
	"time"
	"runtime"
)

type AppStatus struct {
	Name   string
	PID    int
	Path   string
	Status string // running/stopped
	Port   int    // 应用监听的端口
	StartTime string // 应用启动时间
}

// 添加一个结构体来跟踪应用进程和启动时间
type AppProcess struct {
	Cmd       *exec.Cmd
	StartTime time.Time
}

var appProcesses = map[string]*AppProcess{}

func StartApp(app AppConfig) error {
	// 构造命令：如果 Execute 是 java 且 AppPath 以 .jar 结尾，则使用 -jar
	var cmd *exec.Cmd
	if app.Execute == "java" {
		if strings.HasSuffix(app.AppPath, ".jar") {
			args := []string{"-jar", app.AppPath}
			if app.Args != "" {
				args = append(args, strings.Fields(app.Args)...)
			}
			cmd = exec.Command("java", args...)
		} else {
			// 把 AppPath 当作 class 或其他参数
			args := []string{}
			if app.AppPath != "" {
				args = append(args, app.AppPath)
			}
			if app.Args != "" {
				args = append(args, strings.Fields(app.Args)...)
			}
			cmd = exec.Command("java", args...)
		}
	} else if app.Execute == "npm" {
		// npm run start-like: npm run <script> or npm start
		args := []string{"run"}
		if app.AppPath != "" {
			args = append(args, app.AppPath)
		}
		if app.Args != "" {
			args = append(args, strings.Fields(app.Args)...)
		}
		cmd = exec.Command("npm", args...)
	} else if app.Execute == "python" {
		args := []string{}
		if app.AppPath != "" {
			args = append(args, app.AppPath)
		}
		if app.Args != "" {
			args = append(args, strings.Fields(app.Args)...)
		}
		cmd = exec.Command("python", args...)
	} else {
		// 通用可执行器或直接可执行文件
		parts := []string{}
		if app.AppPath != "" {
			parts = append(parts, app.AppPath)
		}
		if app.Args != "" {
			parts = append(parts, strings.Fields(app.Args)...)
		}
		
		// 特殊处理Windows系统中的系统命令
		if runtime.GOOS == "windows" {
			// 棣查是否为Windows系统命令（如notepad）
			if app.Execute != "" {
				// 先尝试直接执行
				cmd = exec.Command(app.Execute, parts...)
			} else if app.AppPath != "" {
				cmd = exec.Command(app.AppPath, parts...)
			} else {
				return fmt.Errorf("no execute or appPath specified")
			}
		} else {
			if app.Execute != "" {
				cmd = exec.Command(app.Execute, parts...)
			} else if app.AppPath != "" {
				cmd = exec.Command(app.AppPath, parts...)
			} else {
				return fmt.Errorf("no execute or appPath specified")
			}
		}
	}
	
	err := cmd.Start()
	if err != nil {
		return err
	}
	
	// 保存进程和启动时间
	appProcesses[app.Name] = &AppProcess{
		Cmd:       cmd,
		StartTime: time.Now(),
	}
	
	// 等待一小段时间以确认进程启动
	time.Sleep(500 * time.Millisecond)
	
	// 检查进程是否仍在运行 (改进Windows环境下的处理)
	if cmd.Process != nil {
		// 在所有平台上都使用 PID 检查进程是否存在
		// 检查PID是否有效（大于0）
		if cmd.Process.Pid <= 0 {
			delete(appProcesses, app.Name)
			return fmt.Errorf("process exited immediately after start")
		}
		
		// 在Windows上，我们使用一个更简单的方法
		// 我们假设如果进程启动后短时间内仍然有有效的PID，那么它就在运行
	} else {
		delete(appProcesses, app.Name)
		return fmt.Errorf("failed to get process")
	}
	
	go func() {
		if app.Daemon {
			cmd.Wait()
		}
	}()
	return nil
}

func StopApp(app AppConfig) error {
	appProc, ok := appProcesses[app.Name]
	if !ok || appProc.Cmd.Process == nil {
		return fmt.Errorf("app not running")
	}
	
	cmd := appProc.Cmd
	
	// 根据操作系统选择合适的信号
	if runtime.GOOS == "windows" {
		// Windows不支持SIGTERM，直接Kill
		err := cmd.Process.Kill()
		if err != nil {
			return err
		}
	} else {
		// Unix-like系统尝试优雅地停止进程
		err := cmd.Process.Signal(syscall.SIGTERM)
		if err != nil {
			// 如果优雅停止失败，则强制杀死进程
			err = cmd.Process.Kill()
			if err != nil {
				return err
			}
		}
	}
	
	// 等待进程退出
	done := make(chan error, 1)
	go func() {
		_, err := cmd.Process.Wait()
		done <- err
	}()
	
	select {
	case <-done:
		// 进程已退出
	case <-time.After(5 * time.Second):
		// 超时，强制杀死进程
		cmd.Process.Kill()
	}
	
	delete(appProcesses, app.Name)
	return nil
}

func QueryStatus(app AppConfig) AppStatus {
	appProc, ok := appProcesses[app.Name]
	status := "stopped"
	pid := 0
	startTime := ""
	
	if ok && appProc.Cmd.Process != nil {
		// 检查进程是否仍在运行
		if runtime.GOOS == "windows" {
			// Windows检查
			if appProc.Cmd.Process.Pid > 0 {
				status = "running"
				pid = appProc.Cmd.Process.Pid
				startTime = appProc.StartTime.Format("2006-01-02 15:04:05")
			} else {
				// 进程不存在，从映射中删除
				delete(appProcesses, app.Name)
			}
		} else {
			// Unix-like系统使用标准的信号检查
			err := appProc.Cmd.Process.Signal(syscall.Signal(0))
			if err == nil {
				// 进程存在
				status = "running"
				pid = appProc.Cmd.Process.Pid
				startTime = appProc.StartTime.Format("2006-01-02 15:04:05")
			} else {
				// 进程不存在，从映射中删除
				delete(appProcesses, app.Name)
			}
		}
	}
	
	return AppStatus{
		Name:      app.Name,
		PID:       pid,
		Path:      app.AppPath,
		Status:    status,
		Port:      app.Port,
		StartTime: startTime,
	}
}