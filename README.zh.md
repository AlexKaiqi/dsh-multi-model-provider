# dsh-multi-model-provider

[English](README.md) | 中文

DeepSeek Harness 的 Agent 辅助模型注册插件。它把“模型登记”与“模型执行”分开：

- 主语言模型继续由 `@deepseek-ai/dsh-llm-pi-ai` 注册和执行，可用于 Agent 主模型选择。
- 图片、语音、音频、视频、Embedding、Reranking 等模型登记在本插件的 task-model catalog 中。
- task-model 被登记后只代表 Harness 知道它的 Provider、模型 id 和能力；必须另有运行时 adapter 才能调用。

这避免了把图片或视频模型伪装成 LLM，也为后续多模型动态路由保留稳定的注册层。

## 当前能力

插件提供十三个 Agent 工具：

- `list_model_routes`：查看 `llm-pi-ai` 的活动/休眠语言模型 Provider、凭据状态和模型 catalog。
- `configure_model_route`：创建或更新语言模型 Provider profile。
- `select_default_model`：选择未来新 Agent 使用的默认主语言模型。
- `list_task_models`：按 id、Provider 或 task 查询非语言模型，并分别返回注册状态与运行时可用性。
- `discover_task_models`：查询 connection 对应的已鉴权 Provider 模型目录，不自动注册。
- `select_task_models`：整体替换启用集合；`ids: []` 明确表示该 connection 全部停用。
- `register_task_model`：登记或更新一条非语言模型路由及其 connection profile。
- `prepare_model_portraits`：把一句“整理初始画像”展开为候选识别、画像概念、资料整理、落库与验证工作流。
- `get_model_portrait`：查看价格、擅长项、限制、速度、I/O、证据、验证状态与可选实测汇总。
- `upsert_model_portrait`：让 Harness Agent 保存整理后的证据化初始画像，并立即做结构验证。
- `validate_model_portrait`：核对画像、注册信息、凭据、adapter，并可选择实时探测。
- `invoke_task_model`：由大语言模型通过统一工具入口调用真正可用的多模态 route。
- `summarize_model_usage`：汇总当前持久会话中 LLM 与 task-model 的成功率、延迟、token、成本等调用观测。

所有注册工具只接收凭据引用（例如 `OPENAI_API_KEY`），不接收 API Key 明文。需要多项认证信息的 Provider 可使用命名引用，例如豆包的 `appId: DOUBAO_APPID` 与 `token: DOUBAO_TOKEN`。用户只需要在 Settings 的安全凭据字段输入真实值；Provider、URL、模型列表和 profile 可以由 Agent 协助填写。

## Settings UI

安装后 Settings 会出现两个互补分节：

- `llm-pi-ai`：语言模型 Provider、URL、凭据引用、模型列表及 LLM profile；这是语言模型的唯一真源。
- `multi-model-provider`：非语言 task-model 的 `connections`、`models`、按 task 的可选 `defaults`，以及以 `llm:<provider>/<model>` 为键的 LLM `portraits`。LLM 注册本身仍归 `llm-pi-ai` 所有。

task-model connection 结构：

```yaml
multi-model-provider:
  connections:
    openai:
      provider: openai
      displayName: OpenAI
      credentialRef: OPENAI_API_KEY
      baseURL: https://api.openai.com/v1
      profile: {}
    volcengine:
      provider: volcengine
      displayName: 火山引擎（方舟 / 豆包）
      credentialRefs:
        arkApiKey: ARK_API_KEY
        speechAppId: DOUBAO_APPID
        speechToken: DOUBAO_TOKEN
      baseURL: https://ark.cn-beijing.volces.com/api/v3
      catalogEndpoint: https://ark.cn-beijing.volces.com/api/v3/models
      catalogCredentialName: arkApiKey
      profile:
        catalogDiscovery: openai-models
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
      capabilities: [image.generate]
      operations: [generate, edit]
      roles: [image-generator]
      profile: {}
```

当前版本内置 `openai/gpt-image-2`，以及与 Lore 一致的豆包 ASR `doubao/volc.bigasr.sauc.duration` 和 TTS `doubao/seed-tts-1.0` 保守 catalog 条目。豆包路由统一挂在 `volcengine` connection 下，并只选择自身所需的语音凭据槽。它们会出现在 `list_task_models`，不会出现在语言模型选择器；在对应 runtime adapter 接入前，其状态明确为 `registered-only`、`callable: false`。

`volcengine` 是统一 Provider：方舟模型目录使用 `ARK_API_KEY` 查询 `/api/v3/models`，豆包语音路由使用 `DOUBAO_APPID` / `DOUBAO_TOKEN`。统一的是 Provider 归属，不是把不同产品线的鉴权强行混为一套。方舟目录也不等价于账号已开通的全部语音资源，因此语音 resource id 仍按官方文档登记。目录发现不会自动注册或自动启用。

每条 task route 都有显式 `enabled` 状态。可用模型选择采用整体替换语义；空数组会原样保持“全部停用”，不会回退为全选。停用模型仍可查看画像，但不能被调用。

支持的 task 包括图片理解/生成、语音合成/识别/翻译/分析、声音转换/克隆/设计、播客、实时语音、音视频生成、Embedding 与 Reranking。完整 id 由 Settings schema 和 `register_task_model` 工具枚举约束。

能力声明与 Lore 对齐，使用稳定的 `capabilities` id，例如 `speech.transcribe.file`、`speech.transcribe.stream`、`speech.synthesize.short`、`speech.realtime_session`、`voice.clone`、`audio.generate`、`video.generate`。同时新增 `file` 输入模态，因此上传文件不会被错误归入普通音频流。

能力不是仅按“模态”分类。每条模型还分别声明 `input`、`output`、`operations` 与 `execution`，因此语音转文字、文字转语音、图生视频和实时流式模型不会混为一类。

## 豆包注册示例

豆包语音没有可无损发现全部资源 id 的统一 catalog，因此插件只内置 connection，不猜测用户已开通的模型。ASR/TTS 资源 id 由 Agent 按实际开通情况登记：

```yaml
multi-model-provider:
  models:
    doubao/big-asr:
      connection: volcengine
      model: volc.bigasr.sauc.duration
      displayName: 豆包大模型录音文件识别
      task: transcription
      runtimeAdapter: doubao-speech
      credentialNames: [speechAppId, speechToken]
      input: [audio, file]
      output: [text]
      execution: streaming
      capabilities: [speech.transcribe.file, speech.transcribe.stream]
      operations: [transcribe-file, transcribe-stream]
      roles: [speech-to-text]
      profile: {}
```

这条记录仍会返回 `registered-only`、`callable: false`；只有 `doubao-speech` 运行时 adapter 接入后才能真正发送请求。

## 模型画像与自动路由

画像把三类信息分开：注册表是输入/输出、能力和执行方式的声明；`portrait` 保存带证据的价格、擅长项、限制、速度与 0..1 路由质量分数；调用日志提供真实成功率、p50/p95 延迟、token 与估算成本。画像同时支持 task route id 和 `llm:<provider>/<model>`。自动路由器不应把厂商文档或人工判断冒充成实测值。

用户只需说“整理初始画像”。插件的 system prompt 会要求 Agent 立即调用 `prepare_model_portraits`，从刚注册、发现、选择或讨论的模型推断范围；没有更窄上下文时处理缺失、未验证、部分有效、无效或过期的启用画像。Agent 随后查询当前官方资料或可信 benchmark → `upsert_model_portrait` → `validate_model_portrait`；只有用户明确允许产生流量或成本时才启用 `liveProbe`。画像概念由插件内置，包括身份、I/O 类型与格式、上下文/输出限制、能力与执行方式、价格、生效时间、擅长项、限制、适用/避用场景、速度、吞吐、质量分数、证据出处和验证状态。

多模态执行采用可插拔 `TaskModelRuntimeAdapter`。Provider adapter（包括 `doubao-speech`）只处理本厂商的鉴权与 wire protocol；核心插件统一校验 route/operation、逐次解析安全凭据、返回标准结果并记录观测。task-model 调用自动追加 `multi-model/invocation`；普通 LLM 调用则直接聚合 Harness 已持久化的 `request/header`、`step/start` 与 `assistant/message.usage`，不会再包一层或重复保存正文。调用记录不保存提示词、回复、媒体内容或凭据。

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

- 本插件负责注册、画像、Settings UI schema、安全凭据引用、统一调用入口和隐私安全的调用观测。
- `llm-pi-ai` 负责语言模型协议适配与调用。
- 图片/音频/视频等运行时 adapter 通过 `TaskModelRuntimeAdapter` 注册并消费本注册表；没有对应 adapter 的 route 仍保持 `registered-only`。
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
dsh plugin --profile web add "$PWD/artifacts/dsh-multi-model-provider-0.1.0-rc.7.tgz"
```

发布 npm 后可安装：

```sh
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.7'
```

升级后重启正在运行的 DSH Web process，并新建 Agent task 以加载新的工具与 system prompt。

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。
