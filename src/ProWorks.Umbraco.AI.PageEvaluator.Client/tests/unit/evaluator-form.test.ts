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

// ---------------------------------------------------------------------------
// Save failure messaging (005-upgrade-cms-17-8-ai-17-6 FR-010: never raw technical text on a network drop)
// ---------------------------------------------------------------------------

describe('evaluator-form.element — save failures', () => {
  it('shows the localized connectivity message, not the raw error, when the network drops on save', async () => {
    server.use(http.post(`${BASE}/configurations`, () => HttpResponse.error()));
    const el = renderForm({ documentTypeAlias: 'blogPost', profileId: 'a1b2', promptText: 'Evaluate.' });

    await el.submit?.();

    expect(el._errors?.['_form']).toBe('evaluatePage_connectivityMessage');
  });

  it('keeps the server message for other save failures (e.g. a 409 concurrency conflict)', async () => {
    server.use(
      http.post(`${BASE}/configurations`, () =>
        HttpResponse.json({ title: 'This configuration was modified by another user.' }, { status: 409 }),
      ),
    );
    const el = renderForm({ documentTypeAlias: 'blogPost', profileId: 'a1b2', promptText: 'Evaluate.' });

    await el.submit?.();

    expect(el._errors?.['_form']).toContain('This configuration was modified by another user.');
  });
});

// ---------------------------------------------------------------------------
// Profile system-prompt notice (005-upgrade-cms-17-8-ai-17-6 FR-012/FR-013, contracts/ui-notices.md §1)
// ---------------------------------------------------------------------------

type PromptNoticeForm = SamplingForm & {
  configId?: string | null;
  _profileHasSystemPrompt?: boolean | null;
  refreshProfileSystemPrompt?: (profileId: string) => Promise<void>;
  _onProfileChange?: (profileId: string) => void;
  _loadConfig?: (id: string) => Promise<void>;
};

const settle = (ms = 20): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('evaluator-form.element — profile system-prompt notice', () => {
  it('records hasSystemPrompt=true for a profile with its own system prompt', async () => {
    server.use(http.get(`${BASE}/profiles/p-friendly/system-prompt`, () => HttpResponse.json({ hasSystemPrompt: true })));
    const el = renderForm({ profileId: 'p-friendly' }) as PromptNoticeForm;

    await el.refreshProfileSystemPrompt?.('p-friendly');

    expect(el._profileHasSystemPrompt).toBe(true);
  });

  it('records hasSystemPrompt=false for a profile without one', async () => {
    server.use(http.get(`${BASE}/profiles/p-plain/system-prompt`, () => HttpResponse.json({ hasSystemPrompt: false })));
    const el = renderForm({ profileId: 'p-plain' }) as PromptNoticeForm;

    await el.refreshProfileSystemPrompt?.('p-plain');

    expect(el._profileHasSystemPrompt).toBe(false);
  });

  it('hides the notice without an error message when the lookup fails (background lookup, FR-010)', async () => {
    server.use(http.get(`${BASE}/profiles/p-broken/system-prompt`, () => HttpResponse.error()));
    const el = renderForm({ profileId: 'p-broken' }) as PromptNoticeForm;
    el._profileHasSystemPrompt = true;

    await el.refreshProfileSystemPrompt?.('p-broken');

    expect(el._profileHasSystemPrompt).toBeNull();
    expect(el._errors?.['profileId']).toBeUndefined();
  });

  it('discards a stale response when the selected profile changed while the lookup was in flight', async () => {
    server.use(
      http.get(`${BASE}/profiles/p-old/system-prompt`, async () => {
        await settle(30);
        return HttpResponse.json({ hasSystemPrompt: true });
      }),
    );
    const el = renderForm({ profileId: 'p-old' }) as PromptNoticeForm;

    const pending = el.refreshProfileSystemPrompt?.('p-old');
    el._profileId = 'p-new';
    await pending;

    expect(el._profileHasSystemPrompt ?? null).toBeNull();
  });

  it('hides the notice immediately and refreshes both notices when the profile changes', async () => {
    let promptLookups = 0;
    let samplingLookups = 0;
    server.use(
      http.get(`${BASE}/profiles/p-next/system-prompt`, async () => {
        promptLookups++;
        await settle(10);
        return HttpResponse.json({ hasSystemPrompt: true });
      }),
      http.get(`${BASE}/profiles/p-next/sampling-support`, () => {
        samplingLookups++;
        return HttpResponse.json({ temperatureSupported: false });
      }),
    );
    const el = renderForm({ profileId: 'p-prev' }) as PromptNoticeForm;
    el._profileHasSystemPrompt = true;

    el._onProfileChange?.('p-next');
    expect(el._profileHasSystemPrompt).toBeNull();

    await settle(40);
    expect(promptLookups).toBe(1);
    expect(samplingLookups).toBe(1);
    expect(el._profileHasSystemPrompt).toBe(true);
    expect(el._temperatureSupported).toBe(false);
  });

  it('looks the notice up again when an existing configuration is opened (FR-013)', async () => {
    const config = {
      id: 'cfg-1', name: 'Home', description: null, documentTypeAlias: 'home', profileId: 'p-later',
      profileName: 'Later', contextId: null, contextName: null, promptText: 'Evaluate.', isActive: true,
      scoringEnabled: false, recommendationsEnabled: true, version: 3, propertyAliases: [],
      dateCreated: '2026-11-02T00:00:00', dateModified: '2026-11-02T00:00:00',
    } as unknown as EvaluatorConfigItem;
    server.use(
      http.get(`${BASE}/configurations/cfg-1`, () => HttpResponse.json(config)),
      http.get(`${BASE}/profiles/p-later/system-prompt`, () => HttpResponse.json({ hasSystemPrompt: true })),
      http.get(`${BASE}/profiles/p-later/sampling-support`, () => HttpResponse.json({ temperatureSupported: true })),
      http.get(`${BASE}/document-type/home/properties`, () => HttpResponse.json({ name: 'Home', properties: [] })),
    );
    const el = renderForm({}) as PromptNoticeForm;
    el.configId = 'cfg-1';

    await el._loadConfig?.('cfg-1');
    await settle(40);

    expect(el._profileHasSystemPrompt).toBe(true);
  });
});
