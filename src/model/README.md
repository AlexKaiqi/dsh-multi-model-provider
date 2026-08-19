# Model-Aware Content Spec

模型能读到的每一段自然语言——能力说明、工具描述、参数描述——都从实现代码中抽离，
集中在本目录。实现代码只负责装配与执行。

## 文件与变化来源

| 文件 | 唯一变化来源 | 内容 |
| --- | --- | --- |
| `guidance.ts` | 模型可见的能力边界说明 | `MODEL_MANAGER_GUIDANCE`：两条注册路径的分工、注册≠可调用、密钥永不进对话 |
| `tool-surfaces.ts` | 五个工具的模型可见表面 | 工具名、描述（正反向激活条件）、参数描述、`helpPointer` |
| `help.ts` | 工具集的版本与命令面 | `VERSION`、`HELP`、`TOOL_NAMES` |

规则：一个文件只有一个变化来源。修改工具措辞、激活条件或参数说明时只改本目录；
修改行为时改 `../operations.ts` / `../registry.ts` / `../tools.ts` / `../index.ts`，
不要在实现侧内联模型可见字符串。

`../tools.ts` 只做装配：工具名、描述、参数描述全部引用本目录的导出，
因此"唯一变化来源"是可验证的，而不只是约定。

## 激活条件

每个工具描述同时写明何时用与何时不用，并指向能查到当前状态的工具：

- 语言/对话模型走 `list_model_routes` / `configure_model_route`（llm-pi-ai 权威）。
- 非语言任务模型走 `list_task_models` / `register_task_model`。
- 两条路径互为反向条件，避免模型把任务模型注册成语言路由。
- `select_default_model` 只影响新建 Agent，不切换当前会话。

## 密钥纪律

注册类工具只接受凭据引用名（如 `OPENAI_API_KEY`），永不接受密钥值。
引用未配置时，指引用户去 Settings 的安全凭据字段，而不是让其粘贴进对话。
该约束由 `guidance.ts` 与每个 `tool-surfaces.ts` 描述共同承载，并由契约测试断言。

## 模型感知内容的固定测试

- `../../tests/model-surface.spec.ts`
  - 五个工具描述都同时含正向与反向激活条件。
  - 每个描述都指向其 `helpPointer` 工具。
  - 描述与参数描述都不含密钥值样式的内容，且注册类工具明示"never an API key value"。
  - `VERSION` 与 package.json 一致；`HELP` 覆盖全部工具名。
  - `../tools.ts` 装配出的工具名与描述与本目录导出逐一相等（防止实现侧偷偷内联）。
