# dsh-multi-model-provider

[English](README.md) | 中文

这个插件做三件事：

1. **登记模型** — 语言模型仍由 `@deepseek-ai/dsh-llm-pi-ai` 注册和执行；图片、语音、音频、视频、Embedding、Reranking 登记在本插件的 task-model catalog。内置 `realtimeModelRuntime` 统一管理 Realtime 路由、凭据解析和角色 profile，Provider 插件只注册 wire adapter。
2. **辅助构建画像** — 证据化画像，加上最多 8 token 的显式测速。写入走 Settings。
3. **选 Agent 主模型** — `selectAgentModel()` / `select_default_model` 从目录里的 live 语言模型中，为之后新建的 Agent 保存主模型。不会自动给 task-model 做路由。

其它插件 `inject: ['modelCatalog']` 后调用 `snapshot()` 读取全部已登记模型、画像和测速。安装本包**不会**让图片、语音或 Realtime 变成可调用；GPT／豆包双工协议由 `dsh-realtime-voice` adapter 提供。

## 三件事

### 1. 登记

语言模型走 `configure_model_route` / `list_model_routes`。非语言模型走 `register_task_model` / `list_task_models`。登记只表示 Harness 知道这条 route；必须另有 runtime adapter 才能调用。`select_task_models` 传入 `ids: []` 会停用该 connection 上全部 route，不会回退成全开。

### 2. 画像

用户说“整理初始画像”即可。`prepare_model_portraits` 给出种子事实、缺口和官方文档入口；Agent 打开文档后调用 `ingest_portrait_research`，价格必须带 http(s) 出处。`lastProbe` 只能来自 Settings 测速，不能从文档抄。`get_model_portrait` / `upsert_model_portrait` / `validate_model_portrait` 仍负责读写画像。

### 3. 选主模型

选主模型建立在目录之上，不再另维护一份列表：

```ts
export const inject = ['modelCatalog']

const snapshot = await ctx.modelCatalog.snapshot()
await ctx.modelCatalog.selectAgentModel({
  provider: 'volcengine',
  model: 'doubao-seed-1-6',
})
```

`snapshot().languageModels` 是 live 的 Agent 主模型候选，有画像时会带上。`selectAgentModel()` 拒绝 task-model 和目录里没有的 id。只影响之后新建的 Agent。

只需要读目录的插件停在 `snapshot()` 即可。不要去解析 `settings.yaml`，也不要让 Agent 为了读目录去调工具。

## Agent 工具

插件仍提供十五个 Agent 工具，覆盖登记、画像和选主模型：

- `list_model_routes`：查看 `llm-pi-ai` 的活动/休眠语言模型 Provider、凭据状态和模型 catalog。
- `configure_model_route`：创建或更新语言模型 Provider profile。
- `inspect_volcengine_provider`：查看火山统一 Provider 的安全凭据状态、当前账号方舟模型目录、语言/VLM 选择、task route 与调用路径。
- `select_volcengine_language_models`：整体替换方舟语言/VLM 选择；空数组明确停用全部火山 LLM。
- `select_default_model`：选择未来新 Agent 使用的默认主语言模型。
- `list_task_models`：按 id、Provider 或 task 查询非语言模型，并分别返回注册状态与运行时可用性。
- `discover_task_models`：查询 connection 对应的已鉴权 Provider 模型目录，不自动注册。
- `select_task_models`：整体替换启用集合；`ids: []` 明确表示该 connection 全部停用。
- `register_task_model`：登记或更新一条非语言模型路由及其 connection profile。
- `prepare_model_portraits`：给出种子事实、缺口和官方文档入口。
- `ingest_portrait_research`：把带 http(s) 出处的调研结果合并进画像。
- `get_model_portrait`：查看价格、擅长项、限制、速度、I/O、证据、验证状态与可选实测汇总。
- `upsert_model_portrait`：让 Harness Agent 保存整理后的证据化初始画像，并立即做结构验证。
- `validate_model_portrait`：核对画像、注册信息、凭据、adapter，并可选择实时探测。
- `invoke_task_model`：由大语言模型通过统一工具入口调用真正可用的多模态 route。
- `summarize_model_usage`：汇总当前持久会话中 LLM 与 task-model 的成功率、延迟、token、成本等调用观测。

所有注册工具只接收凭据引用（例如 `OPENAI_API_KEY`），不接收 API Key 明文。豆包 Realtime 使用单个 `DOUBAO_API_KEY` 引用。用户只需要在 Settings 的安全凭据字段输入真实值；Provider、URL、模型列表和 profile 可以由 Agent 协助填写。

## Settings UI

安装后会扩展 DSH 自带“模型”页，不再增加独立“模型画像”导航。普通语言模型在自己的展开区域显示画像；豆包 Realtime 模型在行内通过“模型画像”展开同一套内容：

- 一份可分章节编辑的 Markdown 模型说明，集中承载定位、擅长、局限和适用场景等定性知识；
- 按操作、单位、金额和币种保存的结构化价格；
- 由显式轻量请求测得的可用性、延迟和观测时间。速度不允许手填；语言模型测试会产生一次最多 8 token 的少量模型费用，豆包 Realtime 测试会建立一次最短会话。尚无运行探针的 ASR/TTS 不显示伪造指标。

火山方舟仍是普通语言模型 Provider。它在添加时使用官方 Base URL、协议和 `ARK_API_KEY`，并在写入配置前自动执行只读模型目录连通性检查。豆包语音是模型页中的另一个独立 Provider，使用单个 `DOUBAO_API_KEY`、内置 Realtime O/SC 音色目录和注册时连接测试。

界面不引入平行配置源：方舟语言模型仍写入官方 `llm-pi-ai.providers.volcengine`；豆包语音 task-model 与全部画像写入 `multi-model-provider`。安全凭据只通过 Credentials API 写入本机凭据存储，不进入普通 `settings.yaml`。ChatVoice 只选择已注册的 Realtime 路由，不再管理 Provider 凭据。

会话底部的模型下拉也支持按 Provider、模型 ID、显示名称和描述检索，模型目录变大后不需要滚动寻找。

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
    doubao-speech:
      provider: doubao-speech
      displayName: 豆包语音
      credentialRef: DOUBAO_API_KEY
      credentialRefs:
        apiKey: DOUBAO_API_KEY
        realtimeApiKey: DOUBAO_API_KEY
      profile:
        product: doubao-speech
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

当前可见目录内置 `openai/gpt-image-2`、`openai/gpt-realtime`，并把官方 Realtime S2S-O 与 SC 2.0 音色映射成 25 个可选语音配置。豆包 Realtime 协议仍固定使用 `session.model=1.2.6.1`；模型页选择的是实际可切换的音色配置，运行时再映射到固定协议版本。豆包路由挂在独立的 `doubao-speech` connection 下，默认停用，用户在模型页选择后才启用。旧 ASR/TTS 条目只用于迁移，不在该 Provider 中显示。

`volcengine` 与 `doubao-speech` 是两个 Provider，因为它们的协议、凭据、目录和连通性测试不同。方舟模型目录使用 `ARK_API_KEY`；Realtime Duplex 使用新版语音控制台的单个 `DOUBAO_API_KEY`。方舟 `/models` 不是语音资源目录；火山的 `ListSpeakers`/`ServiceStatus` OpenAPI 又需要云账号 AK/SK，不能由 Speech API Key 调用，因此单 Key 交互使用官方文档随插件维护的 Realtime 目录，并通过最短会话测试实际可访问性。

安装插件后，Agent 会在用户询问“火山/方舟/豆包有哪些模型、怎么配置、怎么调用”时先调用 `inspect_volcengine_provider`，而不是要求用户手写 YAML。固定知识（两个 Provider id、官方端点、各自的 API Key 引用和模型所属运行时）由插件提供；方舟账号真实可用模型由鉴权 `/models` 动态查询。语言与 VLM 候选通过 `select_volcengine_language_models` 进入普通 Agent 模型选择器；图片、视频、音频、语音和 Embedding 路由只有在 task runtime adapter 可用时才能通过 `invoke_task_model` 调用。Platform 模式部署的模型可能要求使用精确 `ep-*` Endpoint ID。

每条 task route 都有显式 `enabled` 状态。可用模型选择采用整体替换语义；空数组会原样保持“全部停用”，不会回退为全选。停用模型仍可查看画像，但不能被调用。

支持的 task 包括图片理解/生成、语音合成/识别/翻译/分析、声音转换/克隆/设计、播客、实时语音、音视频生成、Embedding 与 Reranking。完整 id 由 Settings schema 和 `register_task_model` 工具枚举约束。

能力声明与 Lore 对齐，使用稳定的 `capabilities` id，例如 `speech.transcribe.file`、`speech.transcribe.stream`、`speech.synthesize.short`、`speech.realtime_session`、`voice.clone`、`audio.generate`、`video.generate`。同时新增 `file` 输入模态，因此上传文件不会被错误归入普通音频流。

能力不是仅按“模态”分类。每条模型还分别声明 `input`、`output`、`operations` 与 `execution`，因此语音转文字、文字转语音、图生视频和实时流式模型不会混为一类。

## 豆包注册示例

豆包语音没有可无损发现全部资源 ID 的统一 catalog，因此插件内置保守的语音模型目录，但默认不启用。其他 ASR/TTS 资源 ID 可由 Agent 按实际开通情况登记：

```yaml
multi-model-provider:
  models:
    doubao/big-asr:
      connection: doubao-speech
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

## 模型画像

画像把三类信息分开：注册表是输入/输出、能力和执行方式的声明；`portrait.description` 是分章节 Markdown 定性说明，`pricing` 是结构化价格，`performance.lastProbe` 是带观测时间的显式实测；调用日志提供长期成功率、p50/p95 延迟、token 与估算成本。画像同时支持 task route id 和 `llm:<provider>/<model>`。不要把厂商文档或人工判断写成实测值。

用户只需说“整理初始画像”。插件的 system prompt 会要求 Agent 立即调用 `prepare_model_portraits`，从刚注册、发现、选择或讨论的模型推断范围；没有更窄上下文时处理缺失、未验证、部分有效、无效或过期的启用画像。Agent 随后查询当前官方资料或可信 benchmark → `upsert_model_portrait` → `validate_model_portrait`；只有用户明确允许产生流量或成本时才启用 `liveProbe`。画像概念由插件内置，包括身份、I/O 类型与格式、上下文/输出限制、能力与执行方式、价格、生效时间、擅长项、限制、适用/避用场景、速度、吞吐、质量分数、证据出处和验证状态。

多模态一次性执行采用可插拔 `TaskModelRuntimeAdapter`；全双工会话采用 `realtimeModelRuntime` 的 `RealtimeModelSessionAdapter`。核心插件统一选择 route、解析安全凭据、裁剪上下文并保存角色 profile；GPT/豆包 adapter 只处理 wire protocol 和浏览器音频传输。task-model 调用自动追加 `multi-model/invocation`；普通 LLM 调用则直接聚合 Harness 已持久化的 `request/header`、`step/start` 与 `assistant/message.usage`，不会再包一层或重复保存正文。调用记录不保存提示词、回复、媒体内容或凭据。

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
4. 只有查询结果报告存在可调用的运行时 adapter 后，上层能力插件才能执行该模型。

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
- 其它插件应 `inject: ['modelCatalog']` 后调用 `ctx.modelCatalog.snapshot()`。不要去解析 `settings.yaml`，也不要让 Agent 为了读目录去调这些工具。
- `selectAgentModel()` / `select_default_model` 从 `snapshot().languageModels` 里选 Agent 主模型。不会给 task-model 做自动路由，只影响之后新建的 Agent。

## 安装

这是面向 DeepSeek Harness `0.1.0-rc.6` 的社区 composition bundle，不是 DeepSeek 官方包。Host 与 Web 运行时文件已提交进仓库，Git 安装不需要 `prepare` 或 `allowBuilds`。

按 commit 固定安装（可复现）：

```sh
dsh plugin --profile web add github:AlexKaiqi/dsh-multi-model-provider#857fdfded2961373d4f3b71cc7809f310711731c
```

跟随 `main`（会随分支更新）：

```sh
dsh plugin --profile web add github:AlexKaiqi/dsh-multi-model-provider
```

本地开发时从 checkout 安装：

```sh
git clone https://github.com/AlexKaiqi/dsh-multi-model-provider.git
cd dsh-multi-model-provider
dsh plugin --profile web add "$PWD"
```

发布到 npm 之后：

```sh
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.9'
```

被 dsh.pub 收录后：

```sh
npx dshpub add AlexKaiqi/dsh-multi-model-provider --profile web
```

确认 bundle 层已挂上，然后重启 Web 并新建 Agent task，才会加载新工具和 system prompt：

```sh
dsh --profile web --dump-config   # 应看到 "# == dsh-multi-model-provider"
dsh web --profile web
```

从 profile 卸载：

```sh
dsh plugin --profile web remove dsh-multi-model-provider
```

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。
