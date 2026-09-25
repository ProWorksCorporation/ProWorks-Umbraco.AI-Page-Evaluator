/**
 * Minimal Management API client for e2e test-data setup.
 *
 * Why not the testhelpers' `umbracoApi` fixture: @umbraco/playwright-testhelpers 17.0.x (the newest 17.x
 * release) looks for the access token in localStorage (`umb:userAuthTokenResponse`), but CMS 17.6 keeps
 * backoffice tokens in HttpOnly cookies, so the fixture throws before a test starts. (CMS 17.6's own
 * acceptance tests moved to an unpublished `@umbraco/acceptance-test-helpers` package.) The page's request
 * context already carries the login cookies from the saved storage state; CMS swaps the real token in for
 * the `Bearer [redacted]` placeholder (`HideBackOfficeTokensHandler`).
 */
import { expect, type APIResponse, type Page } from '@playwright/test';

const AUTH = { Authorization: 'Bearer [redacted]' };

export class ManagementApi {
  constructor(private readonly page: Page) {}

  /**
   * Access tokens are short-lived and refresh tokens are single-use (the backoffice app in an earlier
   * spec has usually rotated the stored one), so a direct refresh_token request fails with invalid_grant.
   * Reloading the backoffice lets the app re-authenticate from its session cookie, which sets fresh
   * token cookies on this page's context.
   */
  private async refresh(): Promise<void> {
    await this.page.goto('/umbraco');
    await expect(this.page.getByRole('tab', { name: 'Content' })).toBeVisible({ timeout: 20000 });
  }

  private async send(request: () => Promise<APIResponse>, expected: number[]): Promise<APIResponse> {
    let response = await request();
    if (response.status() === 401) {
      await this.refresh();
      response = await request();
    }
    expect(expected, `${response.url()} -> ${response.status()} ${await response.text()}`).toContain(response.status());
    return response;
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.send(() => this.page.request.get(path, { headers: AUTH }), [200]);
    return (await response.json()) as T;
  }

  /** POSTs and returns the new resource id (from the body, else the Location header). */
  async create(path: string, data: unknown): Promise<string> {
    const response = await this.send(() => this.page.request.post(path, { headers: AUTH, data }), [200, 201]);
    const text = await response.text();
    if (text.trim().startsWith('{')) {
      const body = JSON.parse(text) as { id?: string };
      if (body.id) return body.id;
    }
    const location = response.headers()['location'] ?? '';
    return location.split('/').filter(Boolean).pop() ?? '';
  }

  async delete(path: string): Promise<void> {
    await this.send(() => this.page.request.delete(path, { headers: AUTH }), [200, 204, 404]);
  }
}
