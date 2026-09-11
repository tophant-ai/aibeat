# 把自己的 Agent 接进来 / Connect your Agent

本目录的两个脚本是**固定回复的 L1 协议示例**，不是参考 Agent 或安全测试结果。
先选一门语言，把 `invoke` 中的固定回复替换成你已有 Agent 的真实调用。
Agent 的模型、工具、工作目录仍由你自己管理，SDK 不接管它们。

从解压后的 AgentBeat 包根目录运行：

```sh
export AGENTBEAT_TARGET_TOKEN='<choose-a-local-secret>'
python3 examples/sdk-target/target.py
# 或 Node 18+（二选一，不要同时占用8091）
node examples/sdk-target/target.mjs
```

源码仓库中的路径是 `examples/agentbeat-sdk-target/`；包内是 `examples/sdk-target/`。
两个脚本都从相对 `../../sdk/` 使用随包源码，不需要 npm/PyPI 安装。
Python 需要3.11+，JS需要Node18+；**这些只用于运行你的Target，不是评测器依赖**。
Windows用 `$env:AGENTBEAT_TARGET_TOKEN='<choose-a-local-secret>'`，然后使用 `py -3` 或 `node`。

## 三个接口

- `GET /healthz`：就绪与观测能力；示例报告L1。
- `POST /v1/agent/invocations`：Bearer鉴权，严格 `target-invocation-v1` 请求。
- `/v1/evidence/{run_id}`：本示例未启用；只有真正采集L2事件时才启用。

使用随示例提供的 `examples/sdk-target/registry.json`。它在 Deployment 中（与 `endpoint` 同级）配置了：

```json
"auth": {"secret_ref": "secret/sdk-demo", "value_env": "AGENTBEAT_TARGET_TOKEN"}
```

同时`target_profile.auth_secret_ref`必须是`secret/sdk-demo`，与此绑定相匹配。
其中 `endpoint.base_url_env` 仍为 `AGENTBEAT_TARGET_URL`。将评测器侧的
`AGENTBEAT_TARGET_URL` 设置为 `http://127.0.0.1:8091`，注册信息中的Target ID保持
`target-agent-quickstart`，与本示例一致。Target进程和评测器进程分别从本地环境取得相同token，
不要把token写入Case、Registry JSON、源码、日志或分享的结果。
使用本示例的`examples/sdk-target/eval-run.json`，其中TargetProfile与带鉴权的Registry保持一致；
不能直接使用无鉴权local-probe的请求（其TargetProfile没有`auth_secret_ref`）。
按包根README配置Judge后运行：

```sh
./bin/agentbeat eval-run < examples/sdk-target/eval-run.json > sdk-result.json
```

真实调用另需数据/费用/副作用授权。

## L2 / L3

SDK有 `EvidenceCollector` 与框架适配器（Python：LangGraph/LangChain/OpenAI Agents/OTel；
JS：Codex app-server）。启用collector并连接真实message/tool事件后再声明L2，
不能仅把 `evidence` 改为true就宣称完整观测。
L3还需评测侧独立State Controller和可验证环境，Target自报快照不等于L3。
详见随包 `sdk/agentbeat-sdk-js/README.md` 和 `sdk/agentbeat-sdk-py/README.md`。
