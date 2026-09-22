import type { AiModel } from '@features/settings/services/ai-models-catalog.util';
import type { ProviderInfo } from '@features/settings/services/ai-providers.util';
import type { SelectOption } from '@core/components/ui/select/select.component';

export function toProviderOptions(providers: ProviderInfo[]): SelectOption[] {
  return [
    { value: 'default', label: 'Server Default (Backend AI)' },
    ...providers.map((p) => ({
      value: p.id,
      label: p.quotaBadge ? `${p.label} — (${p.quotaBadge})` : p.label,
    })),
  ];
}

export function isModelSelected(
  selectedId: string | null,
  model: AiModel,
): boolean {
  return selectedId === model.id;
}

export const AI_TEST_MESSAGE = 'Say hello in one short sentence.';

export function getInputValue(event: Event): string {
  const target = event.target;
  if (target instanceof HTMLInputElement) return target.value;
  return '';
}
