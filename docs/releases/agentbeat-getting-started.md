# AgentBeat 0.4.0 · 开始评测 Agent

**只需一个 `bin/agentbeat` 原生二进制**（Windows为`agentbeat.exe`）。
不需要PromptBeat、Promptfoo或Node。SDK用于接入你自己的Agent，随包以源码形式提供。

## 1. 解压并确认

进入解压得到的 `agentbeat-0.4.0-<platform>` 目录：

```sh
./bin/agentbeat --version
./bin/agentbeat eval-run --help
```

Windows PowerShell：

```powershell
.\bin\agentbeat.exe --version
.\bin\agentbeat.exe eval-run --help
```

## 2. 无 Key 本地试用（Python 3.11+）

终端1，在包根目录启动固定Target与Judge：

```sh
python3 examples/local-probe/serve.py
```

Windows用 `py -3 examples\local-probe\serve.py`。
它们只监听127.0.0.1:39103/39104，**固定回复仅验证协议，不是模型回答或安全效果**。
极简探针不校验Bearer token，不要暴露到公网或照搬到真实Target；真实接入使用下方带鉴权的SDK示例。

终端2，同样进入包根目录：

```sh
export AIBEAT_AGENT_TARGET_REGISTRY="$PWD/examples/local-probe/agent-target-registry.json"
export AGENTBEAT_TARGET_URL="http://127.0.0.1:39103"
export AIBEAT_JUDGE_BASE_URL="http://127.0.0.1:39104/v1"
export AIBEAT_JUDGE_MODEL="local-contract-probe"
./bin/agentbeat eval-run < examples/local-probe/eval-run.json > result.json
```

Windows PowerShell：

```powershell
$env:AIBEAT_AGENT_TARGET_REGISTRY = "$PWD\examples\local-probe\agent-target-registry.json"
$env:AGENTBEAT_TARGET_URL = "http://127.0.0.1:39103"
$env:AIBEAT_JUDGE_BASE_URL = "http://127.0.0.1:39104/v1"
$env:AIBEAT_JUDGE_MODEL = "local-contract-probe"
cmd /c ".\bin\agentbeat.exe eval-run < examples\local-probe\eval-run.json > result.json"
```

结果中应有 `schema_version: eval-run-response-v1`、`execution_route: go_core_business_http`、
一次Target和一次合成Judge调用、L1、`official_benchmark: false`。
评分是固定探针产生的合成值，不可当安全分数宣传。结束后Ctrl+C停止终端1。

## 3. 接入自己的 Agent

打开 [examples/sdk-target/README.md](../../examples/agentbeat-sdk-target/README.md)，选择Python或Node示例，
用你自己的Agent替换`invoke`中的固定响应。
示例使用本地SDK源码，不必从npm/PyPI下载；Python3.11+或Node18+只用于运行Target。
SDK 1.0.0与CLI 0.4.0是独立版本线。

准备：
1. 满足 `POST /v1/agent/invocations` 同步契约的隔离HTTP Agent。
2. 服务端Registry登记，固定Target/deployment身份、endpoint和鉴权。
3. 完整Case与scoring profile（本地探针JSON仅是结构起点，不是正式数据集）。
4. OpenAI-compatible Judge endpoint、模型及必要的本地凭据。

切换到示例Target时，Registry使用`examples/sdk-target/registry.json`，
Target URL使用`http://127.0.0.1:8091`；两进程各自配置相同`AGENTBEAT_TARGET_TOKEN`。
请求改用`examples/sdk-target/eval-run.json`，其中TargetProfile包含与Registry一致的鉴权引用。
真实Judge使用 `AIBEAT_JUDGE_BASE_URL`、`AIBEAT_JUDGE_MODEL`、`AIBEAT_JUDGE_API_KEY`。
**真实eval-run会调用Agent与Judge，先批准数据处理、模型费用和Target副作用。**
不要向真实生产Agent提交未经审核的攻击Case。

## 4. 读懂评测结果

`result.json`包含：
- `.eval_run.status`、`.eval_run.timing`：状态及耗时。
- `.evaluation.metrics`：Utility / Security / ASR / Overall及适用范围。
- `.evaluation.evidence`：观测渠道、缺失信息和覆盖情况。
- `.evaluation.negotiation`：实际可用观测层级。

L1仅最终回复，SDK可选；L2需要实际消息/工具轨迹；L3另需独立State Controller。
层级、通过率和评分有效性不能只靠启用SDK或配置字段证明。

`agentbeat preflight`只验证Case/Target契约，不探测真实服务健康；
`agentbeat score`对已有Evidence评分，不重跑Agent，但会调用配置的Judge。
两者的请求JSON分别是preflight和agent-score协议，不要直接把eval-run请求拿来混用。

## 升级与兼容

旧 `promptbeat api eval-run / agent-run` 改为 `agentbeat eval-run`；
`promptbeat api agent-preflight / agent-score` 改为 `agentbeat preflight / score`。
旧命令返回迁移提示，不再执行。JSON和评分规则未因此改变。
Workbench的`AIBEAT_GO_CORE_BIN`必须指向新版AgentBeat，与Workbench代码同时升级。
旧`agentbeat run --adapter`不属于本轻量包的开箱即用流程，仍需另配历史运行时。

本机已验证Linux命令/固定HTTP契约；macOS/Windows为交叉构建，未在原生系统验收。
包内`MANIFEST.json`记录文件校验值和构建来源；下载校验值见Release的[SHA256SUMS.txt](https://github.com/tophant-ai/aibeat/releases/download/v0.4.0/SHA256SUMS.txt)。
