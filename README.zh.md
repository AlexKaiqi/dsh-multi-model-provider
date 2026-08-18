# dsh-multi-model-provider

[English](README.md) | 中文

DeepSeek Harness 的 Agent 辅助模型注册插件。它把“模型登记”与“模型执行”分开：

- 主语言模型继续由 `@deepseek-ai/dsh-llm-pi-ai` 注册和执行，可用于 Agent 主模型选择。
- 图片、语音、音频、视频、Embedding、Reranking 等模型登记在本插件的 task-model catalog 中。
- task-model 被登记后只代表 Harness 知道它的 Provider、模型 id 和能力；必须另有运行时 adapter 才能调用。

这避免了把图片或视频模型伪装成 LLM，也为后续多模型动态路由保留稳定的注册层。

## 当前能力

插件提供五个 Agent 工具：

- `list_model_routes`：查看 `llm-pi-ai` 的活动/休眠语言模型 Provider、凭据状态和模型 catalog。
- `configure_model_route`：创建或更新语言模型 Provider profile。
- `select_default_model`：选择未来新 Agent 使用的默认主语言模型。
- `list_task_models`：按 id、Provider 或 task 查询非语言模型，并分别返回注册状态与运行时可用性。
- `register_task_model`：登记或更新一条非语言模型路由及其 connection profile。

所有注册工具只接收凭据引用（例如 `OPENAI_API_KEY`），不接收 API Key 明文。用户只需要在 Settings 的安全凭据字段输入 Key；Provider、URL、模型列表和 profile 可以由 Agent 协助填写。

## Settings UI

安装后 Settings 会出现两个互补分节：

- `llm-pi-ai`：语言模型 Provider、URL、凭据引用、模型列表及 LLM profile；这是语言模型的唯一真源。
- `multi-model-provider`：非语言 task-model 的 `connections`、`models` 和按 task 的可选 `defaults`。

task-model connection 结构：

```yaml
multi-model-provider:
  connections:
    openai:
      provider: openai
      displayName: OpenAI
      credentialRef: OPENAI_API_KEY
      baseURL: https://api.openai.com/v1
```

模型注册结构：

```yaml
multi-model-provider:
  models:
    openai/gpt-image-2:
      connection: openai
      model: gpt-image-2
      displayName: GPT Image 2
      task: image-generation
      runtimeAdapter: openai-images
      input: [text, image]
      output: [image]
      execution: request-response
      operations: [generate, edit]
      roles: [image-generator]
      profile: {}
```

当前版本内置以上 `openai/gpt-image-2` catalog 条目。它会出现在 `list_task_models`，不会出现在语言模型选择器；在 `openai-images` 运行时实现接入前，其状态明确为 `registered-only`、`callable: false`。

支持的 task：

- `image-generation`
- `speech-synthesis`
- `transcription`
- `audio-generation`
- `video-generation`
- `embedding`
- `reranking`

能力不是仅按“模态”分类。每条模型还分别声明 `input`、`output`、`operations` 与 `execution`，因此语音转文字、文字转语音、图生视频和实时流式模型不会混为一类。

## Agent 推荐流程

注册语言模型：

1. 用 `list_model_routes` 查找 Provider。
2. 用 `configure_model_route` 写入 Provider profile 和凭据引用。
3. 用户在安全 Settings 字段输入 API Key。
4. 用 `select_default_model` 选择主模型。

注册图片、音频或视频模型：

1. 用 `list_task_models` 检查已有条目。
2. 用 `register_task_model` 登记 connection、Provider、模型 id、task 和能力 profile。
3. 用户在安全 Settings 字段输入 API Key。
4. 只有查询结果报告存在可调用的运行时 adapter 后，上层能力插件或动态路由器才能执行该模型。

API Key 不应出现在聊天、工具参数或普通 `settings.yaml` 字段中。

## 语言模型配置示例

官方 OpenAI route 的最小配置仍是：

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

`openai` 是 pi-ai 内置 route，因此 endpoint、协议和模型 catalog 应默认省略并继承。自定义 OpenAI-compatible gateway 才需要声明 `api`、`baseURL` 和完整 `models` 列表。

## 运行时边界

- 本插件负责注册、Settings UI schema、安全凭据引用和 Agent 注册工具。
- `llm-pi-ai` 负责语言模型协议适配与调用。
- 图片/音频/视频等运行时 adapter 应由独立能力插件提供，并消费本注册表；本版本不发送媒体请求、不处理二进制产物。
- 动态路由应作为后续策略层，从已注册且真正可调用的候选中选择；它不应拥有凭据或复制 catalog。
- `select_default_model` 只影响之后创建的 Agent，已有会话保留自己的选择。

## 安装

包是一个 DSH composition bundle，目标版本为 DeepSeek Harness `0.1.0-rc.6`：

```sh
git clone https://github.com/AlexKaiqi/dsh-multi-model-provider.git
cd dsh-multi-model-provider
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
mkdir -p artifacts
pnpm pack --pack-destination artifacts
dsh plugin --profile web add "$PWD/artifacts/dsh-multi-model-provider-0.1.0-rc.2.tgz"
```

发布 npm 后可安装：

```sh
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.2'
```

升级后重启正在运行的 DSH Web process，并新建 Agent task 以加载新的工具与 system prompt。

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。
