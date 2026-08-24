import {
  defineAdapter,
  type AdapterRunInput,
} from "../../../../sdk/agentbeat-sdk-js/src/index.mjs";

const registration = defineAdapter({
  id: "example/minimal-typescript",
  version: "1.0.0",
  capabilities: ["text", "trace-events"],
  async runTurn(input: AdapterRunInput) {
    return [
      { event_type: "run_started", source: "minimal-typescript" },
      {
        event_type: "agent_response_delta",
        source: "minimal-typescript",
        delta: `Echo: ${input.prompt}`,
      },
    ];
  },
});

const host = process.env.AGENTBEAT_ADAPTER_HOST ?? "127.0.0.1";
const port = Number(process.env.AGENTBEAT_ADAPTER_PORT ?? "8091");

registration.createEvalServer().listen(port, host);
