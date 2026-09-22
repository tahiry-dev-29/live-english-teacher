/**
 * Pure tag-draft helpers (plan-001 T95 split, no Angular deps).
 * Normalization mirrors PromptTagService.addCustom so the shell can
 * validate drafts before hitting the network.
 */

/** Normalize a raw tag name (trim, lowercase, strip leading #, spaces → -). */
export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/^#+/, '').replace(/\s+/g, '-');
}

/** True when name + description drafts are submittable. */
export function canAddTag(name: string, description: string): boolean {
  return normalizeTagName(name).length > 0 && description.trim().length > 0;
}

/** True when the given tag is the one currently edited. */
export function isEditingTag(
  editingName: string | null,
  tagName: string,
): boolean {
  return editingName === tagName;
}
