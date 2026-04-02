/**
 * T043 — Vitest unit tests for evaluator-form.element.ts
 *
 * Tests: validation errors on empty name/doctype/profile/prompt;
 *        save calls correct endpoint; profile picker rendered with capability="Chat".
 *
 * RED STATE: Fails to collect until T050 creates
 * `src/evaluator-config/evaluator-form.element.ts`.
 */

import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

vi.mock('@umbraco-cms/backoffice/extension-api', () => ({}));
vi.mock('@umbraco-cms/backoffice/extension-registry', () => ({
  umbExtensionsRegistry: { registerMany: vi.fn(), unregister: vi.fn() },
}));
vi.mock('@umbraco-cms/backoffice/lit-element', () => ({
  UmbLitElement: class extends HTMLElement {
    static createProperty(_name: PropertyKey, _options?: unknown): void {}
    connectedCallback() {}
    disconnectedCallback() {}
    render() { return null; }
  },
}));
vi.mock('@umbraco-cms/backoffice/notification', () => ({
  UMB_NOTIFICATION_CONTEXT: Symbol('UMB_NOTIFICATION_CONTEXT'),
}));
vi.mock('@umbraco-cms/backoffice/element-api', () => ({
  UmbElementMixin: (Base: typeof HTMLElement) => Base,
}));

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { EvaluatorConfigItem } from '../../src/shared/types.js';

// RED STATE: this import will fail until T050 creates the element
import '../../src/evaluator-config/evaluator-form.element.js';

const ELEMENT_TAG = 'evaluator-form';
const BASE = '/umbraco/management/api/v1/page-evaluator';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  document.body.textContent = '';
});
afterAll(() => server.close());

type FormElement = HTMLElement & {
  _errors?: Record<string, string>;
  _name?: string;
  _documentTypeAlias?: string;
  _profileId?: string;
  _promptText?: string;
  submit?: () => Promise<void>;
};

function renderForm(props: Partial<{
  name: string;
  documentTypeAlias: string;
  profileId: string;
  promptText: string;
}>): FormElement {
  const el = document.createElement(ELEMENT_TAG) as FormElement;
  if (props.name !== undefined) el._name = props.name;
  if (props.documentTypeAlias !== undefined) el._documentTypeAlias = props.documentTypeAlias;
  if (props.profileId !== undefined) el._profileId = props.profileId;
  if (props.promptText !== undefined) el._promptText = props.promptText;
  document.body.appendChild(el);
  return el;
}

describe('evaluator-form.element — validation', () => {
  it('sets name error when name is empty on submit', async () => {
    server.use(
      http.post(`${BASE}/configurations`, () => HttpResponse.json({})),
    );

    const el = renderForm({ name: '', documentTypeAlias: 'blogPost', profileId: 'a1b2', promptText: 'Evaluate.' });
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    await el.submit?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    expect(el._errors?.['name']).toBeTruthy();
  });

  it('sets documentTypeAlias error when empty on submit', async () => {
    server.use(
      http.post(`${BASE}/configurations`, () => HttpResponse.json({})),
    );

    const el = renderForm({ name: 'Test', documentTypeAlias: '', profileId: 'a1b2', promptText: 'Evaluate.' });
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    await el.submit?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    expect(el._errors?.['documentTypeAlias']).toBeTruthy();
  });

  it('sets profileId error when empty on submit', async () => {
    server.use(
      http.post(`${BASE}/configurations`, () => HttpResponse.json({})),
    );

    const el = renderForm({ name: 'Test', documentTypeAlias: 'blogPost', profileId: '', promptText: 'Evaluate.' });
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    await el.submit?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    expect(el._errors?.['profileId']).toBeTruthy();
  });

  it('sets promptText error when empty on submit', async () => {
    server.use(
      http.post(`${BASE}/configurations`, () => HttpResponse.json({})),
    );

    const el = renderForm({ name: 'Test', documentTypeAlias: 'blogPost', profileId: 'a1b2', promptText: '' });
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    await el.submit?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    expect(el._errors?.['promptText']).toBeTruthy();
  });
});

describe('evaluator-form.element — save behaviour', () => {
  it('calls POST /configurations when creating a new config', async () => {
    let postWasCalled = false;
    server.use(
      http.post(`${BASE}/configurations`, () => {
        postWasCalled = true;
        const created: EvaluatorConfigItem = {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'Test',
          description: null,
          documentTypeAlias: 'blogPost',
          profileId: 'a1b2c3d4',
          profileName: null,
          contextId: null,
          contextName: null,
          promptText: 'Evaluate.',
          isActive: true,
          dateCreated: '2026-03-30T12:00:00',
          dateModified: '2026-03-30T12:00:00',
        };
        return HttpResponse.json(created, { status: 201 });
      }),
    );

    const el = renderForm({ name: 'Test', documentTypeAlias: 'blogPost', profileId: 'a1b2c3d4', promptText: 'Evaluate.' });
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    await el.submit?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(postWasCalled).toBe(true);
  });

  it('calls PUT /configurations/{id} when editing an existing config', async () => {
    const existingId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    let putWasCalled = false;
    server.use(
      http.put(`${BASE}/configurations/${existingId}`, () => {
        putWasCalled = true;
        return HttpResponse.json({});
      }),
    );

    const el = renderForm({ name: 'Test', documentTypeAlias: 'blogPost', profileId: 'a1b2c3d4', promptText: 'Evaluate.' });
    // Simulate editing an existing config by setting an id
    (el as FormElement & { _configId?: string })._configId = existingId;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    await el.submit?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(putWasCalled).toBe(true);
  });
});
