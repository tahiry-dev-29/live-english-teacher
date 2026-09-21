# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chat-flow.e2e.spec.ts >> Live English Teacher - App Shell & Chat Flow >> displays chat input and allows typing
- Location: apps/frontend/e2e/chat-flow.e2e.spec.ts:13:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('textarea, input[type="text"]').first()
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" locator('textarea, input[type="text"]').first() with timeout 5000ms
  - waiting for locator('textarea, input[type="text"]').first()
    5 × locator resolved to <input readonly type="text" id="shareable-link-input" class="w-full truncate bg-transparent text-xs text-base-content outline-none select-all"/>
      - unexpected value "hidden"

```

```yaml
- complementary:
    - img "Live Teacher"
    - text: Live Teacher
    - button "Search history"
    - button "Collapse sidebar"
    - button "New chat"
    - text: Recents
    - button "Sort options"
    - button "Reload history" [disabled]
    - list:
        - listitem: No conversations yet
    - text: G Guest User Free Plan
    - button "Settings"
- main:
    - heading "Conversation Room" [level=3]
    - paragraph: Start chatting to practice English!
    - textbox "Message input":
        - /placeholder: Ask anything
    - button "Add attachment"
    - button "Select learning language": 🇬🇧 English
    - button "Start voice input"
    - button "Toggle live call"
    - paragraph: AI can make mistakes. Check important info.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.describe('Live English Teacher - App Shell & Chat Flow', () => {
  4  |   test('loads home page successfully and renders chat interface', async ({ page }) => {
  5  |     await page.goto('/');
  6  |
  7  |     // Check page title and root element
  8  |     await expect(page).toHaveTitle(/Live English Teacher/i);
  9  |     const root = page.locator('app-root');
  10 |     await expect(root).toBeVisible();
  11 |   });
  12 |
  13 |   test('displays chat input and allows typing', async ({ page }) => {
  14 |     await page.goto('/');
  15 |
  16 |     // Locate the textarea / input in chat-input
  17 |     const input = page.locator('textarea, input[type="text"]').first();
> 18 |     await expect(input).toBeVisible();
     |                         ^ Error: expect(locator).toBeVisible() failed
  19 |
  20 |     await input.fill('Hello AI Tutor!');
  21 |     await expect(input).toHaveValue('Hello AI Tutor!');
  22 |   });
  23 |
  24 |   test('opens and navigates settings modal', async ({ page }) => {
  25 |     await page.goto('/');
  26 |
  27 |     // Click settings button if available
  28 |     const settingsButton = page.locator('button[aria-label*="settings" i], button:has-text("Settings"), [data-testid="settings-btn"]').first();
  29 |     if (await settingsButton.isVisible()) {
  30 |       await settingsButton.click();
  31 |       const modal = page.locator('app-settings-dialog, dialog');
  32 |       await expect(modal).toBeVisible();
  33 |     }
  34 |   });
  35 | });
  36 |
```
