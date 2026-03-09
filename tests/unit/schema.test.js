import { describe, expect, test } from "vitest";
import { createEmptyRegistry } from "../../src/schema.js";
describe("schema", () => {
    test("createEmptyRegistry returns an empty registry with epoch timestamp", () => {
        const registry = createEmptyRegistry();
        expect(registry.models).toEqual([]);
        expect(registry.updated_at).toBe("1970-01-01T00:00:00.000Z");
    });
});
