// L1 protocol demo only. Replace invoke with your existing Agent call.
import { createTargetServer } from '../../sdk/agentbeat-sdk-js/src/node.mjs';

const token = process.env.AGENTBEAT_TARGET_TOKEN?.trim();
if (!token) throw new Error('Set AGENTBEAT_TARGET_TOKEN locally before starting this authenticated demo.');

const server = createTargetServer({
  targetId: 'target-agent-quickstart', auth: token, evidence: false,
  async invoke({ input }) {
    // Replace with: const result = await yourAgent(input.text);
    // Return the real final response; do not invent L2 tool events.
    return { finalResponse: 'Use the verified account-recovery flow; identity checks cannot be bypassed.' };
  },
});
server.listen(8091, '127.0.0.1', () => {
  console.log('Protocol demo only (not a real Agent): http://127.0.0.1:8091');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
