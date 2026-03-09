import { describe, expect, test, vi } from "vitest";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runUpdate } from "../../src/cli/index.js";
describe("cli runUpdate", () => {
    test("writes data/pricing.json with registry built from providers", async () => {
        const cwd = await mkdtemp(join(tmpdir(), "llm-pricing-cli-"));
        await mkdir(join(cwd, "data"), { recursive: true });
        const models = [
            {
                provider: "test-provider",
                model: "test-model",
                input_price_per_million: 1,
                output_price_per_million: 2,
                currency: "USD",
                source: "https://example.com"
            }
        ];
        const logger = vi.fn();
        const result = await runUpdate({
            cwd,
            logger,
            // Custom fetchAll to avoid real network calls in tests.
            fetchAll: async (log) => {
                expect(log).toBe(logger);
                return models;
            }
        });
        const jsonPath = join(cwd, "data/pricing.json");
        const raw = await readFile(jsonPath, "utf8");
        const parsed = JSON.parse(raw);
        expect(parsed.models).toEqual(models);
        expect(typeof parsed.updated_at).toBe("string");
        expect(new Date(parsed.updated_at).getTime()).toBeGreaterThan(0);
        expect(result.registry.models).toEqual(models);
        expect(result.outputPath).toBe(jsonPath);
    });
});
