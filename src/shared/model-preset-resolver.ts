import type { ModelPresetsConfig, ModelPresetConfig, AgentOverrides, CategoriesConfig } from "../config/schema"
import { deepMerge } from "./deep-merge"

function matchModelPattern(pattern: string, model: string): boolean {
  if (!pattern.includes("*")) return false

  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(model)
}

export function resolveModelPreset(
  selectedModel: string | undefined,
  presets: ModelPresetsConfig | undefined
): { preset: ModelPresetConfig; matchedPattern: string } | undefined {
  if (!selectedModel || !presets) return undefined

  if (presets[selectedModel]) {
    return { preset: presets[selectedModel], matchedPattern: selectedModel }
  }

  for (const [pattern, config] of Object.entries(presets)) {
    if (matchModelPattern(pattern, selectedModel)) {
      return { preset: config, matchedPattern: pattern }
    }
  }

  return undefined
}

export function mergeAgentOverridesWithPreset(
  staticAgents: AgentOverrides | undefined,
  presetAgents: AgentOverrides | undefined
): AgentOverrides | undefined {
  if (!presetAgents) return staticAgents
  if (!staticAgents) return presetAgents

  return deepMerge(staticAgents, presetAgents) as AgentOverrides
}

export function mergeCategoriesWithPreset(
  staticCategories: CategoriesConfig | undefined,
  presetCategories: CategoriesConfig | undefined
): CategoriesConfig | undefined {
  if (!presetCategories) return staticCategories
  if (!staticCategories) return presetCategories

  return { ...staticCategories, ...presetCategories }
}
