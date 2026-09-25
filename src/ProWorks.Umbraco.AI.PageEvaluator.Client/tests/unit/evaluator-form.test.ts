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
    // UmbLitElement provides this.localize via UmbLocalizationController; echo the key.
    localize = { term: (key: string): string => key };
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
  it('does not raise a name error — the name is edited in the workspace header, not the form', async () => {
    let postWasCalled = false;
    server.use(
      http.post(`${BASE}/configurations`, () => {
        postWasCalled = true;
        return HttpResponse.json({});
      }),
    );

    const el = renderForm({ name: '', documentTypeAlias: 'blogPost', profileId: 'a1b2', promptText: 'Evaluate.' });
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    await el.submit?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    expect(el._errors?.['name']).toBeUndefined();
    expect(postWasCalled).toBe(true);
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
    // Editing an existing config: the workspace sets the public configId property.
    (el as FormElement & { configId?: string }).configId = existingId;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    await el.submit?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(putWasCalled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sampling-support notice (003-upgrade-umbraco-17-6 FR-015a, research R8/R12.6)
// ---------------------------------------------------------------------------

type SamplingForm = FormElement & {
  _temperatureSupported?: boolean | null;
  refreshSamplingSupport?: (profileId: string) => Promise<void>;
};

describe('evaluator-form.element — sampling-support notice', () => {
  it('records temperatureSupported=false for a profile whose model ignores temperature', async () => {
    server.use(
      http.get(`${BASE}/profiles/p-reasoning/sampling-support`, () => HttpResponse.json({ temperatureSupported: false })),
    );
    const el = renderForm({ profileId: 'p-reasoning' }) as SamplingForm;

    await el.refreshSamplingSupport?.('p-reasoning');

    expect(el._temperatureSupported).toBe(false);
  });

  it('records temperatureSupported=true for a profile that honours temperature', async () => {
    server.use(
      http.get(`${BASE}/profiles/p-classic/sampling-support`, () => HttpResponse.json({ temperatureSupported: true })),
    );
    const el = renderForm({ profileId: 'p-classic' }) as SamplingForm;

    await el.refreshSamplingSupport?.('p-classic');

    expect(el._temperatureSupported).toBe(true);
  });

  it('clears the notice state when the lookup fails', async () => {
    server.use(
      http.get(`${BASE}/profiles/p-broken/sampling-support`, () =>
        HttpResponse.json({ type: 'Error', title: 'boom', status: 500 }, { status: 500 }),
      ),
    );
    const el = renderForm({ profileId: 'p-broken' }) as SamplingForm;
    el._temperatureSupported = false;

    await el.refreshSamplingSupport?.('p-broken');

    expect(el._temperatureSupported).toBeNull();
  });

  it('discards a stale response when the selected profile changed while the lookup was in flight', async () => {
    server.use(
      http.get(`${BASE}/profiles/p-old/sampling-support`, async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 30));
        return HttpResponse.json({ temperatureSupported: false });
      }),
    );
    const el = renderForm({ profileId: 'p-old' }) as SamplingForm;

    const pending = el.refreshSamplingSupport?.('p-old');
    el._profileId = 'p-new';
    await pending;

    expect(el._temperatureSupported ?? null).toBeNull();
  });
});
