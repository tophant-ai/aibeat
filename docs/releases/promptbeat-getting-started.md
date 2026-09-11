# PromptBeat 0.4.0 · 开始评测模型与 Prompt

本完整包包含当前Go CLI、Node.js 22.22.2、Promptfoo 0.121.9、示例和Skills。
运行时保留自此前官方v0.2各平台完整包，来源SHA见MANIFEST.json；CLI、示例、Skills已更新。
不含原始Benchmark数据，不需要另装Python来运行PromptBeat。

## 1. 解压进入包目录

```sh
cd promptbeat-0.4.0-linux-x64 # 按平台替换目录名
./bin/promptbeat --version
```

Windows解压ZIP后进入包根目录，用 `.\bin\promptbeat.cmd --version`。
macOS若有安全提示，遵循系统与组织的批准流程，不要关闭系统级保护。

## 2. 无模型账号，先预览测试输入

```sh
mkdir -p artifacts
./bin/promptbeat validate --config examples/bootstrap/promptbeat.yaml
./bin/promptbeat generate --config examples/bootstrap/promptbeat.yaml --count 5 --output artifacts/cases.json
```

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force artifacts | Out-Null
.\bin\promptbeat.cmd validate --config examples\bootstrap\promptbeat.yaml
.\bin\promptbeat.cmd generate --config examples\bootstrap\promptbeat.yaml --count 5 --output artifacts\cases.json
```

打开`artifacts/cases.json`，看到的是测试输入，不是模型回答或评分。
这里的本地validate/generate不调用模型；`--count 5`为上限，实际数量取决于种子。

## 3. 连接自己的模型

先阅读`examples/llm-basic/README.md`。本例需要攻击生成模型、Judge和被测模型三组配置：
`ATTACKER_MODEL_NAME / ATTACKER_BASE_URL / ATTACKER_API_KEY`、
`JUDGE_MODEL_NAME / JUDGE_BASE_URL / JUDGE_API_KEY`、
`TARGET_MODEL_NAME / TARGET_BASE_URL / TARGET_API_KEY`。
密钥只通过本地环境变量提供，不放进YAML、Prompt或Git。

**完整run会访问已配置Provider并可能产生费用；先批准数据、端点与调用范围。**
配置完成后执行：

```sh
./bin/promptbeat validate --config examples/llm-basic/promptbeat.yaml
./bin/promptbeat run --config examples/llm-basic/promptbeat.yaml --output-dir artifacts/llm-basic/run
```

Windows用`.\bin\promptbeat.cmd`替换命令前缀。
`run`执行完整流水线，并不会自动消费上一步的预览JSON。

## 4. 查看结果与复用

打开`artifacts/llm-basic/run/report.html`；结构化结果为同目录`evaluation_result.json`。
本地预览步骤不产生报告，必须完整评测成功后才有结果。
`promptbeat-skills/`内的SKILL.md和references可一起导入支持Skills的编码助手，
它们是操作说明，不会安装CLI或自动配置Key。当前主要覆盖PromptBeat。

Agent评测已独立到AgentBeat：请使用`agentbeat eval-run / preflight / score`，
不再通过旧`promptbeat api` Agent入口。

本机已验证Linux启动和离线预览；macOS/Windows包为交叉构建，运行时继承同平台旧包，
本次未在原生系统验收。文件校验值在MANIFEST.json，下载校验值见Release的[SHA256SUMS.txt](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/SHA256SUMS.txt)。
