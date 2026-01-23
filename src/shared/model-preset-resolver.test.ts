import { describe, test, expect } from "bun:test"
import { resolveModelPreset, mergeAgentOverridesWithPreset, mergeCategoriesWithPreset } from "./model-preset-resolver"
import type { ModelPresetsConfig, AgentOverrides, CategoriesConfig } from "../config/schema"

describe("resolveModelPreset", () => {
  const presets: ModelPresetsConfig = {
    "google/antigravity-claude-opus-4-5-thinking": {
      agents: {
        Sisyphus: { model: "google/antigravity-claude-opus-4-5-thinking" },
        explore: { model: "google/antigravity-gemini-3-flash" },
      },
    },
    "zhipuai-coding-plan/*": {
      agents: {
        Sisyphus: { model: "zhipuai-coding-plan/glm-4.7" },
        explore: { model: "zhipuai-coding-plan/glm-4.5-air" },
      },
    },
    "openai/*": {
      agents: {
        Sisyphus: { model: "openai/gpt-5.2" },
      },
    },
  }

  test("exact match takes priority", () => {
    // #given an exact model match exists
    // #when resolving with that exact model
    const result = resolveModelPreset("google/antigravity-claude-opus-4-5-thinking", presets)

    // #then returns exact match config with matched pattern
    expect(result).toBeDefined()
    expect(result!.matchedPattern).toBe("google/antigravity-claude-opus-4-5-thinking")
    expect(result!.preset.agents?.Sisyphus?.model).toBe("google/antigravity-claude-opus-4-5-thinking")
  })

  test("wildcard pattern matches provider prefix", () => {
    // #given a wildcard pattern for zhipuai-coding-plan
    // #when selecting any model from that provider
    const result = resolveModelPreset("zhipuai-coding-plan/glm-4.5-air", presets)

    // #then returns wildcard match config
    expect(result).toBeDefined()
    expect(result!.matchedPattern).toBe("zhipuai-coding-plan/*")
    expect(result!.preset.agents?.Sisyphus?.model).toBe("zhipuai-coding-plan/glm-4.7")
  })

  test("wildcard matches different models from same provider", () => {
    // #given wildcard pattern for openai
    // #when selecting gpt-5.2
    const result1 = resolveModelPreset("openai/gpt-5.2", presets)
    // #when selecting o3
    const result2 = resolveModelPreset("openai/o3", presets)

    // #then both match the openai/* pattern
    expect(result1?.matchedPattern).toBe("openai/*")
    expect(result2?.matchedPattern).toBe("openai/*")
  })

  test("returns undefined for no match", () => {
    // #given presets that don't include anthropic
    // #when selecting an anthropic model
    const result = resolveModelPreset("anthropic/claude-opus-4-5", presets)

    // #then returns undefined
    expect(result).toBeUndefined()
  })

  test("returns undefined for undefined selectedModel", () => {
    // #given undefined selected model
    // #when resolving
    const result = resolveModelPreset(undefined, presets)

    // #then returns undefined
    expect(result).toBeUndefined()
  })

  test("returns undefined for undefined presets", () => {
    // #given undefined presets
    // #when resolving
    const result = resolveModelPreset("google/antigravity-claude-opus-4-5-thinking", undefined)

    // #then returns undefined
    expect(result).toBeUndefined()
  })
})

describe("mergeAgentOverridesWithPreset", () => {
  test("preset overrides static config", () => {
    // #given static agents config
    const staticAgents: AgentOverrides = {
      Sisyphus: { model: "static/model", temperature: 0.5 },
      oracle: { model: "static/oracle" },
    }

    // #given preset agents config
    const presetAgents: AgentOverrides = {
      Sisyphus: { model: "preset/model" },
    }

    // #when merging
    const result = mergeAgentOverridesWithPreset(staticAgents, presetAgents)

    // #then preset model overrides static, but temperature preserved
    expect(result?.Sisyphus?.model).toBe("preset/model")
    expect(result?.Sisyphus?.temperature).toBe(0.5)
    expect(result?.oracle?.model).toBe("static/oracle")
  })

  test("returns static when preset is undefined", () => {
    // #given only static config
    const staticAgents: AgentOverrides = { Sisyphus: { model: "static/model" } }

    // #when merging with undefined preset
    const result = mergeAgentOverridesWithPreset(staticAgents, undefined)

    // #then returns static config
    expect(result).toEqual(staticAgents)
  })

  test("returns preset when static is undefined", () => {
    // #given only preset config
    const presetAgents: AgentOverrides = { Sisyphus: { model: "preset/model" } }

    // #when merging with undefined static
    const result = mergeAgentOverridesWithPreset(undefined, presetAgents)

    // #then returns preset config
    expect(result).toEqual(presetAgents)
  })
})

describe("mergeCategoriesWithPreset", () => {
  test("preset categories override static", () => {
    // #given static categories
    const staticCategories: CategoriesConfig = {
      "visual": { model: "static/visual" },
      "quick": { model: "static/quick" },
    }

    // #given preset categories
    const presetCategories: CategoriesConfig = {
      "visual": { model: "preset/visual" },
    }

    // #when merging
    const result = mergeCategoriesWithPreset(staticCategories, presetCategories)

    // #then preset overrides visual, quick preserved
    expect(result?.["visual"]?.model).toBe("preset/visual")
    expect(result?.["quick"]?.model).toBe("static/quick")
  })
})
