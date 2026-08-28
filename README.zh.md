# dsh-multi-model-provider

[English](README.md) | 中文

这个插件做三件事：

1. **登记模型** — 语言模型仍由 `@deepseek-ai/dsh-llm-pi-ai` 注册和执行；图片、语音、音频、视频、Embedding、Reranking 登记在本插件的 task-model catalog。内置 `realtimeModelRuntime` 统一管理 Realtime 有效路由选择、凭据引用、adapter/profile 注册和有界会话组装；Provider 插件注册 wire adapter，产品插件注册角色 profile。
2. **辅助构建画像** — 证据化画像，加上最多 8 token 的显式测速。写入走 Settings。
3. **选 Agent 主模型** — `selectAgentModel()` / `select_default_model` 从目录里的 live 语言模型中，为之后新建的 Agent 保存主模型。不会自动给 task-model 做路由。

其它插件 `inject: ['modelCatalog']` 后调用 `snapshot()` 读取全部已登记模型、画像和测速。安装本包**不会**让图片、语音或 Realtime 变成可调用；GPT／豆包双工协议由 `dsh-realtime-voice` adapter 提供。

## 三件事

### 1. 登记

语言模型走 `configure_model_route` / `list_model_routes`。非语言模型走 `register_task_model` / `list_task_models`。登记只表示 Harness 知道这条 route；必须另有 runtime adapter 才能调用。`select_task_models` 传入 `ids: []` 会停用该 connection 上全部 route，不会回退成全开。

### 2. 画像

模型画像设置页与会话模型选择器严格使用同一份 `snapshot().languageModels`；task-model 注册表不会混入 Agent 模型列表。画像只为当前 profile 已注册或已选择的语言模型按需整理，不再提前调研未配置的内置目录项。用户说“整理画像”即可；`prepare_model_portraits` 给出种子事实、缺口和官方文档入口，Agent 打开文档后调用 `ingest_portrait_research`，价格必须带 http(s) 出处。`lastProbe` 只能由用户明确授权后的 Agent 调用 `validate_model_portrait(liveProbe=true)` 写入，不能从文档抄。`get_model_portrait` / `upsert_model_portrait` / `validate_model_portrait` 负责读写画像。

目录保留一组精确 ID 的画像兜底，但只有同一模型在当前 profile 完成注册或选择后才会使用；兜底本身不会创建画像候选，也不会触发提前调研。用户保存的画像永远优先。路由画像可以带对应 Provider 的生效价格；可移植画像不填写虚假的统一价格，因为 API 与自部署成本取决于具体部署。两者都不伪造 benchmark 分数、延迟区间或 `lastProbe`。

领域 task-model 是独立的一层。内置能力目录覆盖 Google Gemini Omni Flash Preview 与 Veo 3.1 Standard / Fast / Lite、MiniMax H3 与 Hailuo 2.3 / Fast、OpenAI Sora 2 / Pro，以及 MiniMax Speech 2.8 HD / Turbo、Music 3.0 和 image-01。每条都保存精确 task、输入输出模态、执行方式和能力边界；这些目录元数据只有被用户注册或选择后才会成为画像目标。H3 是带原生音频输出的 `video-generation` route，不是 Agent LLM。只有对应 runtime adapter 与凭据都可用后，路由才会从 `registered-only` 变成可调用。OpenAI 已把 Sora 2 / Pro 标成 Legacy，Music 3.0 的付费 API 自 2026-08-20 起不再接受新用户，因此这些路由默认停用。

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

`snapshot().languageModels` 是 live 的 Agent 主模型候选，有已保存画像或精确命中的内置画像时会带上；`portraitSource` 标明 `stored` 或 `bundled`。`selectAgentModel()` 拒绝 task-model 和目录里没有的 id。只影响之后新建的 Agent。

只需要读目录的插件停在 `snapshot()` 即可。不要去解析 `settings.yaml`，也不要让 Agent 为了读目录去调工具。

## Agent 工具

插件仍提供十六个 Agent 工具，覆盖登记、画像和选主模型：

- `list_model_routes`：查看 `llm-pi-ai` 的活动/休眠语言模型 Provider、凭据状态和模型 catalog。
- `configure_model_route`：创建或更新语言模型 Provider profile。
- `inspect_volcengine_provider`：查看火山统一 Provider 的安全凭据状态、当前账号方舟模型目录、语言/VLM 选择、task route 与调用路径。
- `select_volcengine_language_models`：整体替换方舟语言/VLM 选择；空数组明确停用全部火山 LLM。
- `select_default_model`：选择未来新 Agent 使用的默认主语言模型。
- `list_task_models`：按 id、Provider 或 task 查询非语言模型，并分别返回注册状态与运行时可用性。
- `discover_task_models`：查询 connection 对应的已鉴权 Provider 模型目录，不自动注册。
- `select_task_models`：整体替换启用集合；`ids: []` 明确表示该 connection 全部停用。
- `register_task_model`：登记或更新一条非语言模型路由及其 connection profile。
- `prepare_model_portraits`：为当前 profile 已配置的模型按需给出种子事实、缺口和官方文档入口；拒绝未配置的内置目录项。
- `ingest_portrait_research`：把带 http(s) 出处的调研结果合并进画像。
- `get_model_portrait`：查看价格、擅长项、限制、速度、I/O、证据、验证状态与可选实测汇总。
- `upsert_model_portrait`：让 Harness Agent 保存整理后的证据化初始画像，并立即做结构验证。
- `validate_model_portrait`：核对画像、注册信息、凭据、adapter，并可选择实时探测。
- `invoke_task_model`：调用真正可用的非 Realtime 请求/响应 route；Realtime 语音必须走 `realtimeModelRuntime` 和 Provider 会话传输。
- `summarize_model_usage`：汇总当前持久会话中 LLM 与 task-model 的成功率、延迟、token、成本等调用观测。

所有注册工具只接收凭据引用（例如 `OPENAI_API_KEY`），不接收 API Key 明文。豆包 Realtime 使用单个 `DOUBAO_API_KEY` 引用。用户只需要在 Settings 的安全凭据字段输入真实值；Provider、URL、模型列表和 profile 可以由 Agent 协助填写。

## Settings UI

安装后只保留 DSH 自带的“模型”管理界面。火山方舟通过 DSH 原生语言模型 Provider 目录接入，因此 DeepSeek 与方舟继续使用宿主的 Provider 行、编辑器、模型列表和删除交互；插件不会再注册第二个“模型”页面或追加另一套 Provider 编辑器。同时提供独立的只读“模型画像”设置页，只有“采集”和“查看”两个 Tab，选择器只列当前 profile 已注册或已选择的模型。采集会在当前会话显式调用内置 `collect-model-portraits` skill，不再创建后台 Agent、独立会话或临时工作区。画像包括：

- 一份由 Agent 根据带出处资料生成的分章节 Markdown 模型说明，集中承载定位、擅长、局限和适用场景等定性知识；
- 按操作、单位、金额和币种保存的结构化价格；
- 由 Agent 在用户明确授权后通过轻量请求测得的可用性、延迟和观测时间。语言模型测试会产生一次最多 8 token 的少量模型费用；支持探针的 task adapter 运行自己的最小测试。尚无运行探针的 Realtime 路由不显示伪造指标。

插件把两种方舟计费方式注册为可同时存在的独立 Provider：`volcengine` 使用按量计费 Base URL `https://ark.cn-beijing.volces.com/api/v3`，`volcengine-agent-plan` 使用订阅 Base URL `https://ark.cn-beijing.volces.com/api/plan/v3`。二者使用 `ARK_API_KEY`，但模型选择与 Session 路由相互独立，且不会静默回退到另一条计费路径。升级时若只存在旧版 `VOLCENGINE_API_KEY`，插件会把值安全复制到标准引用 `ARK_API_KEY`，保留旧引用且不在日志或设置中暴露密钥。豆包语音仍把固定的 Realtime 协议模型 `1.2.6.1` 与音色分开建模。但 DSH `0.1.1-rc.2` 没有开放第三方 Provider 编辑器或模型字段扩展槽，所以本插件不再用第二套页面伪装成原生接入；在宿主提供该契约前，豆包登记与选择保留在 task catalog 和 Agent 工具中。

方舟语言模型仍写入官方 `llm-pi-ai.providers.volcengine`；豆包语音 task-model 与全部画像写入 `multi-model-provider`。ChatVoice 只选择已注册的 Realtime 路由，不拥有 Provider 凭据。

方舟与 DeepSeek 可在宿主“模型”页编辑或删除。豆包不会被伪装成 LLM Provider 放进 Agent 语言模型选择器。

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

当前可见目录内置 Google Gemini Omni Flash Preview 与 Veo 3.1 Standard / Fast / Lite；OpenAI Sora 2 / Pro、`gpt-image-2` 和 `gpt-realtime`；MiniMax H3、Hailuo 2.3 / Fast、Speech 2.8 HD / Turbo、Music 3.0、image-01；以及 25 个官方 Realtime S2S-O / SC 2.0 音色配置。它们挂在各自独立的 Provider connection 下，只出现在 `list_task_models`，不会混进语言模型选择器。生成媒体路由在 adapter 未安装时保持 `registered-only`；Legacy Sora 与 Music API 默认停用。豆包 Realtime 协议固定使用 `session.model=1.2.6.1`，task profile 把协议模型与可选音色分别保存，运行时再自动映射。旧 ASR/TTS 条目只用于迁移。

`volcengine` 与 `doubao-speech` 是两个 Provider，因为它们的协议、凭据、目录和连通性测试不同。方舟模型目录使用 `ARK_API_KEY`；Realtime Duplex 使用新版语音控制台的单个 `DOUBAO_API_KEY`。方舟 `/models` 不是语音资源目录；火山的 `ListSpeakers`/`ServiceStatus` OpenAPI 又需要云账号 AK/SK，不能由 Speech API Key 调用，因此单 Key 交互使用官方文档随插件维护的 Realtime 目录，并通过最短会话测试实际可访问性。

内置豆包目录是能力元数据，不是用户配置。Web 设置不再包装宿主“模型”页，也不追加任务与 Realtime Provider UI。未来要把豆包原生接入，需要 DSH 开放 Provider 编辑器／模型字段扩展点：Provider 行、生命周期和通用字段仍由 DSH 管理，插件只补充音色等语音字段。

安装插件后，Agent 会在用户询问“火山/方舟/豆包有哪些模型、怎么配置、怎么调用”时先调用 `inspect_volcengine_provider`，而不是要求用户手写 YAML。固定知识（两个 Provider id、官方端点、各自的 API Key 引用和模型所属运行时）由插件提供；方舟账号真实可用模型由鉴权 `/models` 动态查询。语言与 VLM 候选通过 `select_volcengine_language_models` 进入普通 Agent 模型选择器；图片、视频、音频、语音和 Embedding 的非 Realtime 路由在 task runtime adapter 可用时通过 `invoke_task_model` 调用，Realtime 语音走 `realtimeModelRuntime`。Platform 模式部署的模型可能要求使用精确 `ep-*` Endpoint ID。

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

内置兜底画像有意不追求全覆盖，也不会单独触发调研。只有当前 profile 已配置模型才会按精确 ID 命中：先匹配带路由价格的 `provider/model` 画像，没有时再匹配明确列出的 Provider 解耦能力画像；不做模糊别名猜测，也不跨 Provider 搬运价格。可用性、首 token 和延迟仍由独立测速与真实调用观测补充。

“模型画像”页只对当前 profile 已注册或已选择的单个模型执行按需采集或刷新，不承担未配置模型的预研目录职责。点击采集后，页面向当前会话发送 `/collect-model-portraits <id>` 并关闭设置。skill 会取得模型/任务级官方来源，通过 `fetch_portrait_source` 打开资料，通过 `ingest_portrait_research` 保存带出处的事实，再执行 `validate_model_portrait(liveProbe=false)`。来源读取器只跟随同一官方站点内的重定向，并能提取文档中心 JSON 正文，不会把空的 JavaScript 外壳误判成有效资料。查看页展示画像、证据、校验与最近实测。采集不会自动运行可能产生流量或费用的实测；用户必须另行明确授权，Agent 才可调用 `validate_model_portrait(liveProbe=true)` 写回结果。

多模态一次性执行采用可插拔 `TaskModelRuntimeAdapter`；全双工会话采用 `realtimeModelRuntime` 的 `RealtimeModelSessionAdapter`。核心插件统一选择有效 route、管理安全凭据引用，并对 Provider adapter 和产品角色 profile 做注册及有界会话组装；GPT/豆包 adapter 负责 wire protocol 和浏览器音频传输，产品插件负责上下文和工具策略。task-model 调用自动追加 `multi-model/invocation`；普通 LLM 调用则直接聚合 Harness 已持久化的 `request/header`、`step/start` 与 `assistant/message.usage`，不会再包一层或重复保存正文。调用记录不保存提示词、回复、媒体内容或凭据。

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

对于自定义语言 route，`contextWindow` 描述模型容量。除非部署明确要求每次请求都发送固定输出上限，否则应省略 `requestMaxTokens`。发现阶段的 `maxTokens` 只作为容量元数据校验，不会持久化为请求默认值，以免把很大的宣称容量错误下发成 `max_output_tokens` 并被兼容网关拒绝。

## 运行时边界

- 本插件负责注册、画像、Settings UI schema、安全凭据引用、请求/响应 task 调用、`realtimeModelRuntime` 和隐私安全的调用观测。
- `llm-pi-ai` 负责语言模型协议适配与调用。
- 图片/音频/视频等运行时 adapter 通过 `TaskModelRuntimeAdapter` 注册并消费本注册表；没有对应 adapter 的 route 仍保持 `registered-only`。
- 其它插件应 `inject: ['modelCatalog']` 后调用 `ctx.modelCatalog.snapshot()`。不要去解析 `settings.yaml`，也不要让 Agent 为了读目录去调这些工具。
- `selectAgentModel()` / `select_default_model` 从 `snapshot().languageModels` 里选 Agent 主模型。不会给 task-model 做自动路由，只影响之后新建的 Agent。

## 安装

这是面向 DeepSeek Harness `0.1.1-rc.2` 的社区 composition bundle，不是 DeepSeek 官方包。Host 与 Web 运行时文件已提交进仓库，Git 安装不需要 `prepare` 或 `allowBuilds`。

`collect-model-portraits` skill 与受限的官方资料读取工具随本包安装，画像采集不再依赖其它 peer 插件。

需要可复现的 Git 安装时，请在 GitHub spec 后追加经过审核的发布 commit SHA（`#<release-commit-sha>`）；不要仅因旧 commit 也声明相同 prerelease 版本就继续固定旧构建。

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
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.18'
```

预发布版本使用 npm `next` tag。

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

版本更新需要显式执行：

```sh
dsh plugin --profile web update dsh-multi-model-provider
```

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

需要 Node.js `^22.19.0 || >=24.0.0` 和 pnpm 11.7.0。
