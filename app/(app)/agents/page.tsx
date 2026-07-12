import { AgentConfigGenerator } from "@/components/agents/agent-config-generator";

export default function AgentConfigsPage() {
  const defaultBaseUrl = (
    process.env.LITELLM_PROXY_URL ?? "http://localhost:4000"
  ).replace(/\/v1\/?$/i, "");

  return <AgentConfigGenerator defaultBaseUrl={defaultBaseUrl} />;
}
