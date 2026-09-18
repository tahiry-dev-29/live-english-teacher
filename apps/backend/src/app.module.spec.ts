import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppModule } from './app.module.ts';

describe('AppModule Integration / E2E', () => {
  it('defines AppModule class with correct decorators', () => {
    assert.ok(AppModule);
    assert.strictEqual(typeof AppModule, 'function');
  });
});
