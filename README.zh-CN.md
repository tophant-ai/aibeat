# AIBeat 0.4.0

**[下载 PromptBeat 或 AgentBeat](https://github.com/tophant-ai/aibeat/releases/tag/v0.4.0)** · [发行说明与四平台下载表](RELEASE.md) · [English](README.md)

两款独立产品，各有清晰命令和上手材料：

| | PromptBeat | AgentBeat |
| --- | --- | --- |
| 评测对象 | 模型与Prompt：红队、质量、回归 | HTTP Agent：任务、安全行为、分层证据 |
| 推荐下载 | 内置Node.js 22.22.2 / Promptfoo 0.121.9的完整包 | 单个原生二进制、Python/JS SDK源码和示例 |
| 主要命令 | `promptbeat validate / generate / run` | `agentbeat eval-run / preflight / score` |
| 教程 | [PromptBeat快速开始](docs/releases/promptbeat-getting-started.md) | [AgentBeat快速开始](docs/releases/agentbeat-getting-started.md) |

Release下载表提供Linux x64、macOS Apple Silicon、macOS Intel、Windows x64归档。
文件名统一为`promptbeat-0.4.0-linux-x64.tar.gz`、`agentbeat-0.4.0-linux-x64.tar.gz`等。
先读解压目录里的`README.md`，用同名`.sha256`校验下载，包内`MANIFEST.json`记录每个文件。

## PromptBeat：先预览输入

从解压后的完整包目录运行（Windows使用`bin\promptbeat.cmd`）：

```sh
mkdir -p artifacts
./bin/promptbeat validate --config examples/bootstrap/promptbeat.yaml
./bin/promptbeat generate --config examples/bootstrap/promptbeat.yaml --count 5 --output artifacts/cases.json
```

这里是无模型调用的测试输入预览，不是模型回答或评分。
随后按包内`examples/llm-basic/README.md`配置自己的模型并运行评测。
真实调用先确认数据、费用和副作用范围。

## AgentBeat：再接入自己的Agent

```sh
./bin/agentbeat --version
./bin/agentbeat eval-run --help
```

[完整教程](docs/releases/agentbeat-getting-started.md)覆盖启动固定本地Target/Judge、选择Registry、运行Case和查看JSON结果。
评测器本身不再依赖PromptBeat、Node或Promptfoo；本地探针/Python Target示例另需Python3.11+。

已有Agent可参考[带鉴权的Python/Node示例](examples/agentbeat-sdk-target/README.md)。
SDK源码：[Python](sdk/agentbeat-sdk-py/README.md)、[JavaScript](sdk/agentbeat-sdk-js/README.md)。
SDK 1.0.0与CLI 0.4.0独立版本，可直接使用随包本地源码，不宣称已发布npm/PyPI。
L1不强制SDK；L2需要真实采集事件；L3另需独立State Controller。

## 升级与验证边界

旧`promptbeat api eval-run / agent-run / agent-preflight / agent-score`现在只返回迁移提示，
请改用AgentBeat原生命令。旧`agentbeat run --adapter`仍需独立历史依赖，不属于轻量包的推荐流程；
仓库保留的legacy示例对应旧接口。

Linux原生命令、运行时ABI和固定HTTP协议集成已核验。macOS/Windows为交叉构建，未做本次原生系统验收。
固定Target/Judge回复**不是实际模型质量或安全效果证明**。
PromptBeat运行时来自同平台官方v0.2包并锁定SHA，本版不是依赖升级。

公共仓库提供文档、SDK源码和示例，不是内部产品源码/历史镜像。
GitHub自动生成的Source code ZIP不是可构建完整产品的源包，请下载上方产品归档。
官网部署和npm/PyPI发布与本次Release分开处理。
