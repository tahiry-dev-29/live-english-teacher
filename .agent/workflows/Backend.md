---
description: Workflow to setup and verify the Backend API integration for the Live English Teacher
---

# Backend API Integration Workflow

This workflow guides you through setting up and verifying the Gemini API integration for the backend live vocal chat.

## 1. Prerequisites

-   **Gemini API Key**: You need a valid API key from Google AI Studio.
-   **Node.js & pnpm**: Ensure you have the correct versions installed.

## 2. Environment Configuration

1.  Create or edit the `.env` file in the root directory.
2.  Add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

## 3. Verify Service Implementation

Ensure `apps/backend/src/app/live/gemini-live/gemini-live.service.ts` is correctly implemented to handle:
-   **Chat**: `getGeminiChatResponse` using `gemini-2.5-flash-preview-09-2025`.
-   **TTS**: `getGeminiTtsAudio` using `gemini-2.5-flash-preview-tts`.

## 4. Verify Gateway Implementation

Ensure `apps/backend/src/app/live/live.gateway.ts` is set up to:
-   Handle `sendMessage` events.
-   Call `GeminiLiveService`.
-   Emit `aiResponse` (text) and `aiAudio` (audio) events.

## 5. Run the Backend

Start the backend server to verify the integration:

// turbo
pnpm start:backend

## 6. Verification

-   Connect a WebSocket client (or the frontend) to `http://localhost:3000`.
-   Send a `sendMessage` event with `{ content: "Hello", type: "text" }`.
-   Verify you receive `aiResponse` and `aiAudio` events.


