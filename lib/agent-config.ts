import type { ModelInfo } from "./types";

export type AgentConfigTarget = "opencode" | "claude" | "codex";

export type GeneratedAgentConfig = {
  filename: string;
  language: "json" | "bash" | "toml";
  content: string;
  environment?: string;
  installPath: string;
};

function gatewayRoot(value: string) {
  return value.trim().replace(/\/+$/, "").replace(/\/v1$/i, "");
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function tomlString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function generateAgentConfig({
  target,
  baseUrl,
  key,
  selectedModels,
  models,
}: {
  target: AgentConfigTarget;
  baseUrl: string;
  key: string;
  selectedModels: string[];
  models: ModelInfo[];
}): GeneratedAgentConfig {
  const root = gatewayRoot(baseUrl) || "https://gateway.example.com";
  const secret = key || "<YOUR_VIRTUAL_KEY>";
  const selected = selectedModels.length > 0 ? selectedModels : ["<MODEL_ID>"];
  const defaultModel = selected[0];

  if (target === "opencode") {
    const configuredModels = Object.fromEntries(
      selected.map((modelName) => [
        modelName,
        { name: models.find((item) => item.model_name === modelName)?.model_name ?? modelName },
      ])
    );

    return {
      filename: "opencode.json",
      language: "json",
      installPath: "./opencode.json or ~/.config/opencode/opencode.json",
      content: JSON.stringify(
        {
          $schema: "https://opencode.ai/config.json",
          model: `litellm/${defaultModel}`,
          provider: {
            litellm: {
              npm: "@ai-sdk/openai-compatible",
              name: "LiteLLM Gateway",
              options: {
                baseURL: `${root}/v1`,
                apiKey: "{env:LITELLM_API_KEY}",
              },
              models: configuredModels,
            },
          },
        },
        null,
        2
      ),
      environment: `export LITELLM_API_KEY=${shellQuote(secret)}`,
    };
  }

  if (target === "claude") {
    return {
      filename: "claude-gateway.sh",
      language: "bash",
      installPath: "Source this file before starting Claude Code",
      content: [
        `export ANTHROPIC_BASE_URL=${shellQuote(root)}`,
        `export ANTHROPIC_AUTH_TOKEN=${shellQuote(secret)}`,
        `export ANTHROPIC_MODEL=${shellQuote(defaultModel)}`,
        `export ANTHROPIC_CUSTOM_MODEL_OPTION=${shellQuote(defaultModel)}`,
        `export ANTHROPIC_CUSTOM_MODEL_OPTION_NAME=${shellQuote(`${defaultModel} via LiteLLM`)}`,
        `export ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION=${shellQuote("Routed through the LiteLLM gateway")}`,
        "export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1",
        `# Selected models: ${selected.join(", ")}`,
      ].join("\n"),
    };
  }

  const profiles = selected.flatMap((modelName, index) => [
    "",
    `[profiles.litellm_${index + 1}]`,
    `model = ${tomlString(modelName)}`,
    'model_provider = "litellm"',
  ]);

  return {
    filename: "config.toml",
    language: "toml",
    installPath: "~/.codex/config.toml",
    content: [
      `model = ${tomlString(defaultModel)}`,
      'model_provider = "litellm"',
      "",
      "[model_providers.litellm]",
      'name = "LiteLLM Gateway"',
      `base_url = ${tomlString(`${root}/v1`)}`,
      'env_key = "LITELLM_API_KEY"',
      'wire_api = "responses"',
      ...profiles,
    ].join("\n"),
    environment: `export LITELLM_API_KEY=${shellQuote(secret)}`,
  };
}
