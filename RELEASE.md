# AIBeat 0.4.0

## 更新

- AgentBeat 的 `eval-run`、`preflight`、`score` 可独立运行，不再依赖 PromptBeat。
- AgentBeat 安装包附带 Python、JavaScript SDK 和接入示例。
- PromptBeat 安装包内置 Node.js 22.22.2、Promptfoo 0.121.9，附使用示例和 Skills。

## 下载

| 系统 | PromptBeat | AgentBeat |
| --- | --- | --- |
| Linux x64 | [tar.gz](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/promptbeat-0.4.0-linux-x64.tar.gz) | [tar.gz](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/agentbeat-0.4.0-linux-x64.tar.gz) |
| macOS Apple Silicon | [tar.gz](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/promptbeat-0.4.0-darwin-arm64.tar.gz) | [tar.gz](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/agentbeat-0.4.0-darwin-arm64.tar.gz) |
| macOS Intel | [tar.gz](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/promptbeat-0.4.0-darwin-x64.tar.gz) | [tar.gz](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/agentbeat-0.4.0-darwin-x64.tar.gz) |
| Windows x64 | [zip](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/promptbeat-0.4.0-windows-x64.zip) | [zip](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/agentbeat-0.4.0-windows-x64.zip) |

解压后按包内 `README.md` 操作。校验值统一放在 [SHA256SUMS.txt](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/SHA256SUMS.txt)。

Linux 已实测；macOS 和 Windows 为交叉构建，尚未完成原生环境测试。

## 升级

旧的 `promptbeat api eval-run / agent-run` 改用 `agentbeat eval-run`；
`agent-preflight / agent-score` 改用 `agentbeat preflight / score`。JSON 协议和评分规则不变。
