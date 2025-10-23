# AnyRun — 轻量进程管理器

本项目包含Go后端和React前端（Vite）。

快速开始（开发）：

1. 启动后端（命令行模式）：

```powershell
go run .
```

2. 启动后端（UI模式，监听 `anyrun.toml` 中 `ui_port`）：

```powershell
go run . -ui
```

3. 启动前端（开发模式）：

```bash
cd web
npm install
npm run dev
```

构建与打包：

- Windows: 使用 `build.ps1`，例如：

```powershell
.\build.ps1 -targets windows/amd64,linux/amd64
```

- Unix/macOS: 使用 `build.sh`，例如：

```bash
./build.sh linux/amd64 darwin/arm64
```

打包脚本会在 `dist/` 目录中生成按平台命名的二进制文件。

配置：

- 配置文件为 `anyrun.toml`，示例参见仓库根目录。
- 前端可以在线编辑配置并保存，后端会同步写入 `anyrun.toml`。

支持目标：Windows、Linux、macOS，架构：amd64、386、arm、arm64、mips、mipsle 等。

安全提示：在生产环境请使用合适的安全策略（鉴权、TLS）。