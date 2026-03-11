# Model Metadata And Benchmarks

`llm-pricing` should not present a fake universal "best value" score.

The repo now separates:

- raw provider pricing
- model metadata
- benchmark definitions

That makes it possible to compare models inside defensible buckets such as:

- general-purpose text models
- coding models
- reasoning models
- low-cost models
- long-context models

## Source policy

Metadata and benchmark sources should be ranked by trust:

1. Official provider docs or official provider APIs
2. Official benchmark maintainer sites or repositories
3. Hugging Face model cards for open-weight models only
4. Research papers as methodology references

Do not treat parameter count or a model card alone as a universal capability proxy.

## Reliable metadata sources

Closed/API models should use provider-maintained docs first:

- OpenAI models docs: https://platform.openai.com/docs/models
- Anthropic models overview: https://docs.anthropic.com/en/docs/models-overview
- Google Gemini models docs: https://ai.google.dev/gemini-api/docs/models
- Mistral model docs: https://docs.mistral.ai/getting-started/models/
- Zhipu model overview: https://docs.bigmodel.cn/cn/guide/start/model-overview
- DeepSeek docs: https://api-docs.deepseek.com/quick_start/pricing
- Qwen model directory: https://help.aliyun.com/zh/model-studio/models

For providers that do not expose a stable model overview page, the pricing/docs surface may be the most stable canonical source until a better official model catalog exists.

Open-weight models can additionally use:

- Hugging Face model cards: https://huggingface.co/docs/hub/model-cards

Use Hugging Face as a metadata source for:

- parameter count
- architecture
- license
- base model lineage
- model card links

Do not use Hugging Face as the canonical source for proprietary hosted models.

## Reliable benchmark sources

The benchmark layer should prefer benchmark-maintainer sources:

- SWE-bench: https://www.swebench.com/
- LiveBench: https://github.com/LiveBench/LiveBench
- LiveCodeBench: https://livecodebench.github.io/
- Berkeley Function Calling Leaderboard: https://gorilla.cs.berkeley.edu/leaderboard.html

These are useful for normalized cost views such as:

- cost per LiveBench point
- cost per SWE-bench verified resolved-rate point
- cost per LiveCodeBench pass@1 point
- cost per BFCL point

Each normalized view should be labeled with the benchmark name and should never be shown as a universal quality ranking.

## Current implementation

The repo now writes:

- `data/models.json`
- `data/benchmarks.json`

`models.json` is a model catalog keyed by provider/model with:

- family inference
- access type
- openness
- modality
- comparison buckets
- release stage
- metadata source IDs

`benchmarks.json` currently stores:

- trusted benchmark definitions
- source links
- an empty `results` array for future ingestion

This is intentional. Benchmark values should only be added once the source and ingestion path are explicit and reproducible.
