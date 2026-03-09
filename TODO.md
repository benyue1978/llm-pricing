## OpenAI 定价抓取与类型扩展 TODO

- **实现 OpenAI 官方定价抓取（Text Token）**
  - **解析来源**: 仅使用官网 `https://platform.openai.com/pricing`，不依赖聚合价格网站。
  - **抓取范围**: 先支持 Text Token 相关模型（如 GPT-4.1 / GPT-4o / GPT-4o mini / o系列等），忽略 Image / Audio 等非文本计费。
  - **解析方式**: 针对真实页面结构编写解析逻辑（包括 table / 卡片 / 自定义 data-attributes 等），不要依赖测试用的 synthetic fixture 结构。
  - **健壮性**: 页面结构变动时能够优雅失败，可以通过上次成功时间来检查失败。

- **扩展价格数据结构**
  - **新增字段 `type`**: 在 `PricingModel` 中增加模型类型字段（例如 `"text" | "image" | "audio" | "embedding" | "tool"` 等），当前实现中为 Text Token 设置为 `"text"`，后续可扩展。
  - **保持 `source` 字段**: 已有的 `source` 字段继续使用官网 URL，OpenAI 相关记录统一使用 `https://platform.openai.com/pricing`。
  - **数据输出**: 更新 `data/pricing.json` 的生成逻辑以包含 `type` 字段，并保证 CLI `update` 命令生成的数据结构与 schema 一致。

- **完善 OpenAI provider 相关测试**
  - **单元测试策略**:
    - 解析逻辑单测可以继续使用 fixture，但 fixture 必须尽量贴近当前官网真实 HTML 结构（例如在本地抓取一次真实 HTML 做删减后保存成 fixture）。
    - 保留一个“手工 fallback”单测，保证当页面解析失败时仍能返回至少一个有效模型。
  - **集成测试 / provider fetch 测试**:
    - `tests/unit/providers-fetch.test.ts` 中的 OpenAI 测试优先使用真实网络请求（受 `SKIP_OPENAI_LIVE` 环境变量控制）。
    - 在 CI 场景中允许通过环境变量跳过 live 测试，但本地调试时建议开启一次完整 live 验证。

- **Provider 增加与验证通用流程**
  - **流程要求**:
    - 只使用厂商官网的定价页面作为唯一权威来源（SaaS 平台或聚合网站一律不用）。
    - 对于开源模型，也要找到对应公司 / 项目的官方页面（例如 GitHub 项目主页或官方文档站点）。
  - **实现步骤**:
    - 找到官网定价页面 URL，并记录到 `source` 字段。
    - 分析页面结构，确定价格所在的 DOM 结构、单位（每 token / 每 1K / 每 1M 等）以及货币。
    - 根据页面结构实现解析函数，统一输出到 `PricingModel[]`。
    - 将新 provider 的抓取逻辑接入通用 fetch/聚合流程，并更新 `data/pricing.json`。
    - 为 provider 增加或补充单元测试（包含解析 fixture 测试 + fetch 级别测试）。

- **新增可复用的 Skill（provider-adding-workflow）**
  - **Skill 位置**: 建议放在项目内 `.cursor/skills/` 目录，例如 `.cursor/skills/provider-pricing-workflow/SKILL.md`。
  - **Skill 内容要点**:
    - 描述何时应该使用该 Skill（当需要新增或更新任一 LLM provider 的价格时自动触发）。
    - 详细列出“从 0 到 1”增加 provider 的步骤：定位官网、分析定价页面、设计解析逻辑、实现抓取函数、补充单元测试与集成测试、更新 `pricing.json`。
    - 包含一个简明的 Checklist，方便在实际开发时逐项勾选，确保不会遗漏测试与验证步骤。
    - 强调只允许使用官网定价页面，不得使用第三方聚合网站的数据。
  - **在其他 provider 上复用**:
    - 在后续为 Anthropic / Google / Mistral / DeepSeek / Qwen / Moonshot / Minimax / Zhipu 等 provider 新增或更新定价抓取逻辑时，统一按照该 Skill 的流程执行。
    - 实际操作中如果遇到流程覆盖不到的情况（例如页面结构极端复杂、需要登录、存在分页等），优先更新/迭代 Skill 的说明与 Checklist，再按新的 Skill 流程继续推进，这样后续 provider 可以直接复用改进后的流程。

- **测试与验证约定（执行代码改动时遵守）**
  - 修改任意 provider 相关代码（包括 OpenAI 抓取逻辑、schema 字段扩展、Skill 中约定的脚本）时，需要：
    - 至少运行一次与 provider 相关的 Vitest 单元测试（例如 `npx vitest tests/unit/providers-openai.test.ts` 或 `npx vitest tests/unit/providers-fetch.test.ts`）。
    - 在可能的情况下，本地运行 `npm test` 或 `npm run test:unit` 做更广覆盖验证。
    - 在回复/文档中记录运行过的命令及其结果（通过 / 失败与原因）。
