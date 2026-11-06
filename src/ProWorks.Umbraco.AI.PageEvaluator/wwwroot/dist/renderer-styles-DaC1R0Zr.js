import { css as l } from "@umbraco-cms/backoffice/external/lit";
const c = ["notFailing", "notRecommendable", "noRecommendation"];
function a(r) {
  return typeof r == "object" && r !== null && !Array.isArray(r);
}
function i(r) {
  return typeof r == "string" && r.trim() !== "" ? r : null;
}
function p(r) {
  return c.some((e) => e === r);
}
function n(r) {
  if (typeof r == "string") return i(r);
  if (!a(r)) return null;
  const e = r.error;
  return typeof e == "string" ? i(e) : a(e) ? i(e.message) : null;
}
function d(r) {
  if (!a(r)) return null;
  const e = r.error;
  return a(e) ? i(e.code) : null;
}
function f(r) {
  if (!a(r)) return null;
  const e = i(r.propertyAlias), o = r.value;
  return e === null || typeof o != "string" ? null : {
    propertyAlias: e,
    fieldName: i(r.propertyName) ?? e,
    value: o,
    canApply: r.canApply !== !1,
    blockedByRichTextBlocks: r.applyBlockedReason === "richTextBlocks"
  };
}
function v(r) {
  if (!a(r)) return null;
  const e = i(r.propertyAlias);
  if (e === null) return null;
  const o = r.reason;
  return { propertyAlias: e, reason: p(o) ? o : null };
}
function s(r, e) {
  if (!Array.isArray(r)) return [];
  const o = [];
  for (const t of r) {
    const u = e(t);
    u !== null && o.push(u);
  }
  return o;
}
function y(r) {
  return a(r) ? {
    recommendations: s(r.recommendations, f),
    skipped: s(r.skipped, v),
    errorMessage: r.success === !1 || r.error !== void 0 ? n(r) : null
  } : { recommendations: [], skipped: [], errorMessage: n(r) };
}
function m(r) {
  return a(r) && r.success === !0 ? { applied: !0, propertyAlias: i(r.propertyAlias) } : { applied: !1, code: d(r), message: n(r) };
}
const h = l`
  :host {
    display: block;
    max-width: 100%;
    font-size: var(--uui-type-small-size);
    color: var(--uui-color-text);
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: var(--uui-size-space-2);
    padding: var(--uui-size-space-2) var(--uui-size-space-3);
    background: var(--uai-chat-surface-alt, var(--uui-color-surface-alt));
    border-radius: var(--uui-border-radius);
  }

  .status uui-loader-circle {
    font-size: var(--uui-type-small-size);
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-3);
    padding: var(--uui-size-space-3);
    background: var(--uai-chat-surface-alt, var(--uui-color-surface-alt));
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
    min-width: 0;
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--uui-size-space-2);
    font-weight: 600;
    min-width: 0;
  }

  .header.positive {
    color: var(--uui-color-positive);
  }

  .header .field,
  .header .title {
    overflow-wrap: anywhere;
  }

  .field {
    font-weight: 600;
    color: var(--uui-color-text);
    overflow-wrap: anywhere;
  }

  .value {
    margin: 0;
    padding: var(--uui-size-space-2) var(--uui-size-space-3);
    max-height: var(--uui-size-80);
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: inherit;
    font-size: var(--uui-type-small-size);
    line-height: 1.5;
    background: var(--uui-color-surface);
    border: 1px solid var(--uui-color-divider);
    border-radius: var(--uui-border-radius);
  }

  .value:focus-visible {
    outline: 2px solid var(--uui-color-focus);
    outline-offset: 1px;
  }

  .note {
    margin: 0;
    color: var(--uui-color-text-alt);
  }

  .note.warning {
    display: flex;
    align-items: flex-start;
    gap: var(--uui-size-space-2);
    color: var(--uui-color-text);
  }

  .note.warning uui-icon {
    color: var(--uui-color-warning-standalone);
  }

  .error {
    display: flex;
    align-items: flex-start;
    gap: var(--uui-size-space-2);
    color: var(--uui-color-danger);
    overflow-wrap: anywhere;
  }

  .error .label {
    font-weight: 600;
  }

  .error uui-icon,
  .note uui-icon {
    flex: none;
    margin-top: var(--uui-size-1);
  }
`;
export {
  h as a,
  m as b,
  n as e,
  y as r
};
//# sourceMappingURL=renderer-styles-DaC1R0Zr.js.map
