/** One live-discovered chat model. */
export interface DiscoveredAiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  size?: string;
  contextWindow?: number;
  isDefault?: boolean;
}
