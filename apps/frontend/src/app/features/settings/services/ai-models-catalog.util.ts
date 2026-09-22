/** Pure AI-model catalog helpers (plan-001 T95 split, no Angular deps). */

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  size?: string;
  contextWindow?: number;
  isDefault?: boolean;
}

export function getModelsForProvider(
  models: AiModel[],
  provider: string,
): AiModel[] {
  if (provider === 'default') {
    return models;
  }
  return models.filter((m) => m.provider === provider);
}

/** Merge live fetch results, keeping other providers' live models. */
export function mergeLiveModels(
  current: AiModel[],
  fetched: AiModel[],
  activeProvider: string | null,
): AiModel[] {
  const filterProvider = activeProvider ?? undefined;
  const others = filterProvider
    ? current.filter((m) => m.provider !== filterProvider)
    : current;
  const tagged: AiModel[] = fetched.map((m) => ({
    ...m,
    provider: m.provider || activeProvider || 'unknown',
  }));
  return [...others, ...tagged];
}

/** Drop one provider's models after an empty live response (no mocks). */
export function pruneProviderModels(
  current: AiModel[],
  activeProvider: string | null,
): AiModel[] {
  return activeProvider
    ? current.filter((m) => m.provider !== activeProvider)
    : current;
}

export function resolveModel(
  models: AiModel[],
  provider: string,
  modelId: string,
): AiModel | null {
  if (!modelId) return null;
  if (provider === 'default') {
    return models.find((m) => m.id === modelId) || null;
  }
  const match = models.find((m) => m.id === modelId && m.provider === provider);
  if (match) return match;
  return models.filter((m) => m.provider === provider)[0] || null;
}

/** Pure core of ensureValidSelection: returns the model id to select. */
export function selectValidModelId(
  models: AiModel[],
  provider: string,
  currentModelId: string,
): string {
  const providerModels = getModelsForProvider(models, provider);

  if (provider === 'default') {
    // Find any model marked as default across all providers.
    const defaultModel = providerModels.find((m) => m.isDefault);
    if (defaultModel && defaultModel.id !== currentModelId) {
      return defaultModel.id;
    } else if (!currentModelId && providerModels.length > 0) {
      return providerModels[0].id;
    }
    return currentModelId;
  }

  if (
    providerModels.length > 0 &&
    !providerModels.some((m) => m.id === currentModelId)
  ) {
    const defaultModel =
      providerModels.find((m) => m.isDefault) || providerModels[0];
    return defaultModel.id;
  }
  return currentModelId;
}
