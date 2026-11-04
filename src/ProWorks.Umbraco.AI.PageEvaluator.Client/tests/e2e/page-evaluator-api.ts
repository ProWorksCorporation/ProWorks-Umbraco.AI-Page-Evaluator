/**
 * Thin e2e wrapper for the endpoints the acceptance-test helpers have no dedicated helper for: this
 * package's own Management API (evaluator configurations) and Umbraco.AI's (`/umbraco/ai/management/api/v1`).
 *
 * Built on `new ApiHelpers(page)` from @umbraco-cms/acceptance-test-helpers (same auth as CMS's own
 * acceptance tests: the browser context's cookies plus the `Bearer [redacted]` placeholder that
 * `HideBackOfficeTokensHandler` swaps for the real token). Deliberately NOT the `umbracoApi` fixture: before
 * every test it does a refresh_token grant and, when that fails, falls back to a password API login — and
 * with the TestSite's `AllowConcurrentLogins: false` a login revokes the user's other sessions (005 research R7).
 * Instead a 401 is retried once after reloading the backoffice, which re-authenticates from the session cookie.
 */
import { expect, type APIResponse, type Page } from '@playwright/test';
import { ApiHelpers } from '@umbraco-cms/acceptance-test-helpers';
import { API } from './helpers';

export interface EvaluatorConfigInput {
  name: string;
  description: string | null;
  documentTypeAlias: string;
  profileId: string;
  contextId: string | null;
  promptText: string;
  propertyAliases: string[] | null;
  scoringEnabled: boolean;
  recommendationsEnabled: boolean;
}

export class PageEvaluatorApi {
  readonly helpers: ApiHelpers;

  constructor(private readonly page: Page) {
    this.helpers = new ApiHelpers(page);
  }

  private url(path: string): string {
    return `${this.helpers.baseUrl}${path}`;
  }

  /**
   * Loads the backoffice and waits until the app has authenticated, so the context's token cookies are
   * fresh. Call it before using `helpers.*` directly: unlike `send()`, those helpers don't retry a 401 —
   * after earlier specs have rotated the stored tokens they would parse the empty 401 body and throw
   * "Unexpected end of JSON input". Refresh tokens are single-use, so this re-authenticates from the
   * session cookie instead.
   */
  async ensureAuthenticated(): Promise<void> {
    await this.page.goto(this.url('/umbraco'));
    await expect(this.page.getByRole('tab', { name: 'Content' })).toBeVisible({ timeout: 20000 });
  }

  private async reauthenticate(): Promise<void> {
    await this.ensureAuthenticated();
  }

  /** Runs `call`, retrying once after re-authenticating on 401, and asserts the status is expected. */
  async send(call: () => Promise<APIResponse>, expected: readonly number[]): Promise<APIResponse> {
    let response = await call();
    if (response.status() === 401) {
      await this.reauthenticate();
      response = await call();
    }
    expect(expected, `${response.url()} -> ${response.status()} ${await response.text()}`).toContain(response.status());
    return response;
  }

  /** Creates an evaluator configuration and returns its id (from the `CreatedAtAction` Location header). */
  async createConfig(config: EvaluatorConfigInput): Promise<string> {
    const response = await this.send(() => this.helpers.post(this.url(`${API}/configurations`), config), [200, 201]);
    return this.helpers.getIdFromLocation(response);
  }

  async deleteConfig(id: string): Promise<void> {
    await this.send(() => this.helpers.delete(this.url(`${API}/configurations/${id}`)), [200, 204, 404]);
  }

  /** The id of the first Umbraco.AI profile on the site. */
  async firstProfileId(): Promise<string> {
    const response = await this.send(
      () => this.helpers.get(this.url('/umbraco/ai/management/api/v1/profiles'), { skip: 0, take: 1 }),
      [200],
    );
    const body = (await response.json()) as { items: { id: string }[] };
    const id = body.items[0]?.id;
    expect(id, 'at least one Umbraco.AI profile on the TestSite').toBeDefined();
    return id!;
  }
}
