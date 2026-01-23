# Model Presets Feature - Implementation Plan

## Overview

Implement a feature that dynamically selects different agent model configurations based on the user's selected model in OpenCode's input box.

**Use Case**: When user selects "Claude Opus 4.5 Thinking (Antigravity)" in OpenCode UI, all agents use one preset configuration. When user selects "GLM-4.7", agents use a different preset configuration.

## Current Architecture Analysis

### Key Files and Data Flow

```
opencode.json (user config)
    └── config.model (e.g., "google/antigravity-claude-opus-4-5-thinking")
              │
              ▼
    Plugin Config Handler (src/plugin-handlers/config-handler.ts)
              │
              ├── Line 106: config.model as string | undefined
              │
              ▼
    createBuiltinAgents() (src/agents/utils.ts)
              │
              ├── Line 133: systemDefaultModel parameter
              │
              ▼
    Agent factories (sisyphus.ts, oracle.ts, etc.)
              │
              └── Each agent has DEFAULT_MODEL fallback
```

### Current Model Priority (High to Low)

1. `oh-my-opencode.json` → `agents[agentName].model` (explicit override)
2. For Sisyphus only: `systemDefaultModel` (from `config.model`)
3. Each agent's hardcoded `DEFAULT_MODEL`

### Current Limitation

The `agents` config in `oh-my-opencode.json` is **static** - it cannot change based on the selected model. The system needs a new concept: **Model Presets**.

## Proposed Solution: Model Presets

### Config Schema Design

```jsonc
// ~/.config/opencode/oh-my-opencode.json
{
  // New top-level field
  "model_presets": {
    // Preset name can be:
    // - Full model string: "google/antigravity-claude-opus-4-5-thinking"
    // - Model pattern with wildcard: "google/antigravity-*"
    // - Provider prefix: "zhipuai-coding-plan/*"
    "google/antigravity-claude-opus-4-5-thinking": {
      "agents": {
        "Sisyphus": { "model": "google/antigravity-claude-opus-4-5-thinking" },
        "librarian": { "model": "google/antigravity-claude-opus-4-5-thinking" },
        "explore": { "model": "google/antigravity-gemini-3-flash" },
        "oracle": { "model": "zhipuai-coding-plan/glm-4.7" },
        "frontend-ui-ux-engineer": { "model": "google/antigravity-gemini-3-pro" },
        "document-writer": { "model": "google/antigravity-gemini-3-flash" },
        "multimodal-looker": { "model": "google/antigravity-gemini-3-flash" }
      }
    },
    "zhipuai-coding-plan/glm-4.7": {
      "agents": {
        "Sisyphus": { "model": "zhipuai-coding-plan/glm-4.7" },
        "librarian": { "model": "zhipuai-coding-plan/glm-4.7" },
        "explore": { "model": "zhipuai-coding-plan/glm-4.5-air" },
        "oracle": { "model": "zhipuai-coding-plan/glm-4.7" },
        "frontend-ui-ux-engineer": { "model": "zhipuai-coding-plan/glm-4.7" },
        "document-writer": { "model": "zhipuai-coding-plan/glm-4.5-air" },
        "multimodal-looker": { "model": "zhipuai-coding-plan/glm-4.6v" }
      }
    }
  },
  
  // Existing agents field becomes the "fallback" when no preset matches
  "agents": {
    // ... existing static config (used when no preset matches)
  }
}
```

### Matching Priority

1. **Exact match**: `"google/antigravity-claude-opus-4-5-thinking"`
2. **Pattern match**: `"google/antigravity-*"` (wildcard)
3. **Provider match**: `"zhipuai-coding-plan/*"` (all models from provider)
4. **Fallback**: Use static `agents` config

---

## Implementation Tasks

### Phase 1: Schema Definition

#### Task 1.1: Add ModelPresetsConfigSchema to Zod schema
**File**: `src/config/schema.ts`

```typescript
// Add new schema
export const ModelPresetConfigSchema = z.object({
  agents: AgentOverridesSchema.optional(),
  categories: CategoriesConfigSchema.optional(),
})

export const ModelPresetsConfigSchema = z.record(
  z.string(), // Model pattern (e.g., "google/antigravity-*")
  ModelPresetConfigSchema
)

// Update OhMyOpenCodeConfigSchema
export const OhMyOpenCodeConfigSchema = z.object({
  // ... existing fields
  model_presets: ModelPresetsConfigSchema.optional(), // NEW
})
```

#### Task 1.2: Export new types
**File**: `src/config/schema.ts`

```typescript
export type ModelPresetConfig = z.infer<typeof ModelPresetConfigSchema>
export type ModelPresetsConfig = z.infer<typeof ModelPresetsConfigSchema>
```

---

### Phase 2: Preset Resolution Logic

#### Task 2.1: Create preset resolver module
**File**: `src/shared/model-preset-resolver.ts` (NEW)

```typescript
import type { ModelPresetsConfig, ModelPresetConfig } from "../config/schema"

/**
 * Match patterns against selected model
 * Supports:
 * - Exact match: "google/antigravity-claude-opus-4-5-thinking"
 * - Wildcard: "google/antigravity-*"
 * - Provider prefix: "zhipuai-coding-plan/*"
 */
export function resolveModelPreset(
  selectedModel: string | undefined,
  presets: ModelPresetsConfig | undefined
): ModelPresetConfig | undefined {
  if (!selectedModel || !presets) return undefined
  
  // 1. Exact match
  if (presets[selectedModel]) {
    return presets[selectedModel]
  }
  
  // 2. Pattern match (wildcard)
  for (const [pattern, config] of Object.entries(presets)) {
    if (matchModelPattern(pattern, selectedModel)) {
      return config
    }
  }
  
  return undefined
}

function matchModelPattern(pattern: string, model: string): boolean {
  if (!pattern.includes("*")) return false
  
  // Convert pattern to regex
  // "google/antigravity-*" -> "^google/antigravity-.*$"
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape regex chars
    .replace(/\*/g, ".*") // Convert * to .*
  
  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(model)
}
```

#### Task 2.2: Add unit tests
**File**: `src/shared/model-preset-resolver.test.ts` (NEW)

```typescript
import { describe, test, expect } from "bun:test"
import { resolveModelPreset } from "./model-preset-resolver"

describe("resolveModelPreset", () => {
  // #given presets with exact match
  const presets = {
    "google/antigravity-claude-opus-4-5-thinking": {
      agents: { Sisyphus: { model: "google/antigravity-claude-opus-4-5-thinking" } }
    },
    "zhipuai-coding-plan/*": {
      agents: { Sisyphus: { model: "zhipuai-coding-plan/glm-4.7" } }
    }
  }

  test("exact match takes priority", () => {
    // #when selecting exact model
    const result = resolveModelPreset(
      "google/antigravity-claude-opus-4-5-thinking",
      presets
    )
    // #then returns exact match config
    expect(result?.agents?.Sisyphus?.model).toBe("google/antigravity-claude-opus-4-5-thinking")
  })

  test("wildcard pattern matches provider", () => {
    // #when selecting model from zhipuai provider
    const result = resolveModelPreset("zhipuai-coding-plan/glm-4.5-air", presets)
    // #then returns wildcard match config
    expect(result?.agents?.Sisyphus?.model).toBe("zhipuai-coding-plan/glm-4.7")
  })

  test("returns undefined for no match", () => {
    // #when selecting unknown model
    const result = resolveModelPreset("openai/gpt-5.2", presets)
    // #then returns undefined
    expect(result).toBeUndefined()
  })
})
```

---

### Phase 3: Plugin Config Integration

#### Task 3.1: Modify loadPluginConfig to accept selectedModel
**File**: `src/plugin-config.ts`

The current `loadPluginConfig` doesn't have access to `config.model` at load time. The resolution must happen in `createConfigHandler` where `config.model` is available.

No changes needed here.

#### Task 3.2: Create preset-aware agent overrides merger
**File**: `src/shared/model-preset-resolver.ts` (add function)

```typescript
import type { AgentOverrides } from "../config/schema"
import { deepMerge } from "./deep-merge"

/**
 * Merge agent overrides with preset taking priority
 * Priority: preset.agents > static agents config
 */
export function mergeAgentOverridesWithPreset(
  staticAgents: AgentOverrides | undefined,
  presetAgents: AgentOverrides | undefined
): AgentOverrides | undefined {
  if (!presetAgents) return staticAgents
  if (!staticAgents) return presetAgents
  
  // Preset values override static config
  return deepMerge(staticAgents, presetAgents) as AgentOverrides
}
```

---

### Phase 4: Config Handler Integration

#### Task 4.1: Modify createConfigHandler to apply presets
**File**: `src/plugin-handlers/config-handler.ts`

```typescript
import { resolveModelPreset, mergeAgentOverridesWithPreset } from "../shared/model-preset-resolver"

export function createConfigHandler(deps: ConfigHandlerDeps) {
  const { ctx, pluginConfig, modelCacheState } = deps

  return async (config: Record<string, unknown>) => {
    // ... existing provider config handling ...
    
    // NEW: Resolve model preset based on selected model
    const selectedModel = config.model as string | undefined
    const preset = resolveModelPreset(selectedModel, pluginConfig.model_presets)
    
    // NEW: Merge preset agents with static agents config
    const effectiveAgentOverrides = mergeAgentOverridesWithPreset(
      pluginConfig.agents,
      preset?.agents
    )
    
    // NEW: Merge preset categories with static categories
    const effectiveCategories = preset?.categories
      ? { ...pluginConfig.categories, ...preset.categories }
      : pluginConfig.categories
    
    // Update to use effective overrides
    const builtinAgents = createBuiltinAgents(
      pluginConfig.disabled_agents,
      effectiveAgentOverrides, // Changed from pluginConfig.agents
      ctx.directory,
      config.model as string | undefined,
      effectiveCategories, // Changed from pluginConfig.categories
      pluginConfig.git_master
    )
    
    // ... rest of existing logic ...
  }
}
```

#### Task 4.2: Add logging for preset resolution
**File**: `src/plugin-handlers/config-handler.ts`

```typescript
// After resolveModelPreset call
if (preset) {
  log("Model preset applied", { 
    selectedModel, 
    matchedPreset: Object.keys(pluginConfig.model_presets ?? {})
      .find(k => resolveModelPreset(selectedModel, { [k]: preset }))
  })
}
```

---

### Phase 5: Schema Build & Exports

#### Task 5.1: Update exports
**File**: `src/config/index.ts`

```typescript
export type {
  // ... existing exports
  ModelPresetConfig,
  ModelPresetsConfig,
} from "./schema"
```

#### Task 5.2: Update shared/index.ts exports
**File**: `src/shared/index.ts`

```typescript
export {
  resolveModelPreset,
  mergeAgentOverridesWithPreset,
} from "./model-preset-resolver"
```

---

### Phase 6: Documentation

#### Task 6.1: Update configurations.md
**File**: `docs/configurations.md`

Add new section documenting `model_presets` configuration.

---

## Testing Strategy

### Unit Tests
- `src/shared/model-preset-resolver.test.ts` - Pattern matching logic
- `src/plugin-handlers/config-handler.test.ts` - Integration with config handler

### Integration Tests
- Verify preset switching works when model changes
- Verify fallback to static config when no preset matches
- Verify pattern matching priority (exact > wildcard > provider)

---

## File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/config/schema.ts` | MODIFY | Add ModelPresetsConfigSchema |
| `src/shared/model-preset-resolver.ts` | CREATE | Preset resolution logic |
| `src/shared/model-preset-resolver.test.ts` | CREATE | Unit tests |
| `src/shared/index.ts` | MODIFY | Export new functions |
| `src/plugin-handlers/config-handler.ts` | MODIFY | Apply presets in config handler |
| `src/config/index.ts` | MODIFY | Export new types |
| `docs/configurations.md` | MODIFY | Document new feature |

---

## Estimated Implementation Order

1. **Task 1.1-1.2**: Schema definition (30 min)
2. **Task 2.1-2.2**: Resolver module + tests (45 min)
3. **Task 3.2**: Merger function (15 min)
4. **Task 4.1-4.2**: Config handler integration (30 min)
5. **Task 5.1-5.2**: Exports (10 min)
6. **Task 6.1**: Documentation (20 min)

**Total estimated time**: ~2.5 hours

---

## Example Usage

After implementation, user can configure:

```jsonc
// ~/.config/opencode/oh-my-opencode.json
{
  "model_presets": {
    "google/antigravity-claude-opus-4-5-thinking": {
      "agents": {
        "Sisyphus": { "model": "google/antigravity-claude-opus-4-5-thinking" },
        "librarian": { "model": "google/antigravity-claude-opus-4-5-thinking" },
        "explore": { "model": "google/antigravity-gemini-3-flash" },
        "oracle": { "model": "zhipuai-coding-plan/glm-4.7" },
        "frontend-ui-ux-engineer": { "model": "google/antigravity-gemini-3-pro" },
        "document-writer": { "model": "google/antigravity-gemini-3-flash" },
        "multimodal-looker": { "model": "google/antigravity-gemini-3-flash" }
      }
    },
    "zhipuai-coding-plan/*": {
      "agents": {
        "Sisyphus": { "model": "zhipuai-coding-plan/glm-4.7" },
        "librarian": { "model": "zhipuai-coding-plan/glm-4.7" },
        "explore": { "model": "zhipuai-coding-plan/glm-4.5-air" },
        "oracle": { "model": "zhipuai-coding-plan/glm-4.7" },
        "frontend-ui-ux-engineer": { "model": "zhipuai-coding-plan/glm-4.7" },
        "document-writer": { "model": "zhipuai-coding-plan/glm-4.5-air" },
        "multimodal-looker": { "model": "zhipuai-coding-plan/glm-4.6v" }
      }
    }
  }
}
```

When user selects model in OpenCode UI:
- `google/antigravity-claude-opus-4-5-thinking` → Uses first preset
- `zhipuai-coding-plan/glm-4.7` or `zhipuai-coding-plan/glm-4.5-air` → Uses second preset (wildcard match)
- Other models → Falls back to static `agents` config
