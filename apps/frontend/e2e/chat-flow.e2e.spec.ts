import { test, expect } from '@playwright/test';

test.describe('Live English Teacher - App Shell & Chat Flow', () => {
  test('loads home page successfully and renders chat interface', async ({ page }) => {
    await page.goto('/');

    // Check page title and root element
    await expect(page).toHaveTitle(/Live English Teacher/i);
    const root = page.locator('app-root');
    await expect(root).toBeVisible();
  });

  test('displays chat input and allows typing', async ({ page }) => {
    await page.goto('/');

    // Locate the textarea / input in chat-input
    const input = page.locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible();

    await input.fill('Hello AI Tutor!');
    await expect(input).toHaveValue('Hello AI Tutor!');
  });

  test('opens and navigates settings modal', async ({ page }) => {
    await page.goto('/');

    // Click settings button if available
    const settingsButton = page.locator('button[aria-label*="settings" i], button:has-text("Settings"), [data-testid="settings-btn"]').first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      const modal = page.locator('app-settings-dialog, dialog');
      await expect(modal).toBeVisible();
    }
  });
});
