/**
 * FR-007 / FR-008: the package release version must be identical in the client
 * package.json, the backoffice manifest (umbraco-package.json — CMS 17.6 uses it for
 * per-package cache-busting of App_Plugins scripts) and the RCL's <Version>.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const clientRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rclRoot = join(clientRoot, '..', 'ProWorks.Umbraco.AI.PageEvaluator');

function readJsonVersion(path: string): string {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));
  if (typeof parsed === 'object' && parsed !== null && 'version' in parsed && typeof parsed.version === 'string') {
    return parsed.version;
  }
  throw new Error(`No string "version" in ${path}`);
}

function readCsprojVersion(path: string): string {
  const match = /<Version>([^<]+)<\/Version>/.exec(readFileSync(path, 'utf-8'));
  if (!match?.[1]) throw new Error(`No <Version> in ${path}`);
  return match[1].trim();
}

describe('package version sync', () => {
  const clientVersion = readJsonVersion(join(clientRoot, 'package.json'));

  it('umbraco-package.json version matches the client package.json version', () => {
    expect(readJsonVersion(join(rclRoot, 'wwwroot', 'umbraco-package.json'))).toBe(clientVersion);
  });

  it('the RCL <Version> matches the client package.json version', () => {
    expect(readCsprojVersion(join(rclRoot, 'ProWorks.Umbraco.AI.PageEvaluator.csproj'))).toBe(clientVersion);
  });
});
