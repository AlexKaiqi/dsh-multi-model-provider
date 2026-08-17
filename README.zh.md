# dsh-multi-model-provider

[English](README.md) | 中文

DeepSeek Harness 的 Agent 辅助模型管理插件。它不实现新的 LLM adapter，也不维护第二份模型注册表；`@deepseek-ai/dsh-llm-pi-ai` 的 `llm-pi-ai` Settings 分节仍是 Provider 与模型 catalog 的唯一真源。

本插件增加三个模型可见工具：

- `list_model_routes`：查看活动或休眠的 Provider、安全的凭据状态和活动路由的模型 catalog。
- `configure_model_route`：创建或更新一条 pi-ai Provider profile；未传入的已有字段会保留。工具只接受 `apiKeyEnv` 凭据引用，不接受 API Key 值。
- `select_default_model`：验证并保存未来新 Agent 使用的默认主模型。

## 安装

包是一个 DSH composition bundle，目标版本为 DeepSeek Harness `0.1.0-rc.6`：

首次发布 npm 包之前，从本地 checkout 安装：

```sh
git clone https://github.com/AlexKaiqi/dsh-multi-model-provider.git
cd dsh-multi-model-provider
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
mkdir -p artifacts
pnpm pack --pack-destination artifacts
dsh plugin --profile web add "$PWD/artifacts/dsh-multi-model-provider-0.1.0-rc.1.tgz"
```

发布 npm 包之后可直接安装：

```sh
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.1'
```

安装或升级后重启已经运行的 DSH Web process，并新建一个 Agent task。`dsh-base` 已经挂载 `llm-pi-ai`、Settings、Credentials、Tools、System Prompt 和 `agent-default-model`；bundle 只插入本插件自身。

## 推荐使用流程

用户可以告诉 Agent“添加 OpenAI 并把某个 GPT 模型设为默认模型”。Agent 应当：

1. 调用 `list_model_routes` 确认 `openai` catalog route。
2. 调用 `configure_model_route`，传入 `provider: openai` 和 `apiKeyEnv: OPENAI_API_KEY`。
3. 如果工具返回 `requiresCredential: true`，让用户在 Web 的 Models 设置页安全输入 API Key。
4. 再次查看路由，选择 catalog 中的真实模型 id。
5. 调用 `select_default_model` 保存选择。

API Key 不应出现在聊天、工具参数或 `settings.yaml` 中。Web Models 页通过 Credentials seam 把值写入受管 credential store；Provider profile 只保存引用。

## 配置结果

官方 OpenAI route 的最小 Settings 结果是：

```yaml
llm-pi-ai:
  providers:
    openai:
      apiKeyEnv: OPENAI_API_KEY

agent-default-model:
  provider: openai
  model: <gpt-model-id>
  reasoningEffort: high
```

`openai` 是 pi-ai 内置 route，因此 endpoint、wire protocol 和模型 catalog 都应该省略并继承。显式的非空 `models` 列表会替换内置 catalog。

自定义 OpenAI-compatible gateway 需要完整声明：

```yaml
llm-pi-ai:
  providers:
    team-openai:
      displayName: Team OpenAI Gateway
      apiKeyEnv: TEAM_OPENAI_API_KEY
      api: openai-responses
      baseURL: https://gateway.example.com/v1
      models:
        - id: <model-id>
          name: Primary GPT
          contextWindow: 200000
          maxTokens: 32000
          input:
            - text
            - image
```

## 生效边界

- Provider Settings 由 `llm-pi-ai` 热加载；写入成功后 adapter 会注册或更新 route。
- 凭据按模型请求解析，轮换 Key 不要求修改 Provider profile。
- `select_default_model` 只影响之后创建的 Agent。已有会话保留自己的选择；当前会话使用 Web 的模型选择器切换。
- 第一版不会删除 Provider、不会接收明文凭据、不会执行动态路由，也不会替代 Web Models 页。

## 未来动态路由

动态路由应作为独立策略层接入 `agent/request` waterfall，从已经注册且可解析的候选中选择 Provider/模型。注册、凭据、模型能力与路由策略保持分离，避免配置形成两个真源。

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。
