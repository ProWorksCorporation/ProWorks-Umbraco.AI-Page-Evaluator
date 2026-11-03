import { UmbConditionBase as P, umbExtensionsRegistry as E } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as v } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as h } from "@umbraco-cms/backoffice/http-client";
const r = h, n = "/umbraco/management/api/v1/page-evaluator", i = [{ scheme: "bearer", type: "http" }], g = "NetworkError";
class c extends Error {
  constructor(a, e, o = null, u = null) {
    super(`API ${a}: ${e}`), this.status = a, this.detail = e, this.category = o, this.type = u;
  }
}
const A = "Network request failed";
function p(t, a) {
  if (t === null || typeof t != "object" || !(a in t)) return null;
  const e = t[a];
  return typeof e == "string" ? e : null;
}
function w(t) {
  return t instanceof Error && t.message.length > 0 ? t.message : A;
}
function y(t) {
  const a = t.error;
  if (a instanceof Error)
    return new c(t.response.status, a.message, null, null);
  const o = p(a, "title") ?? (typeof a == "string" && a.length > 0 ? a : a ? JSON.stringify(a) : `HTTP ${t.response.status}`);
  return new c(t.response.status, o, p(a, "category"), p(a, "type"));
}
function l(t) {
  if (!t.response.ok || t.error !== void 0) throw y(t);
  return t.data;
}
async function s(t) {
  let a;
  try {
    a = await t();
  } catch (o) {
    throw o instanceof TypeError ? new c(0, o.message, null, g) : o;
  }
  const { response: e } = a;
  if (e === void 0)
    throw new c(0, w(a.error), null, g);
  return { data: a.data, error: a.error, response: e };
}
async function $() {
  const t = await s(
    () => r.get({ security: i, throwOnError: !1, url: `${n}/configurations` })
  );
  return l(t);
}
async function L(t) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(t)}`
    })
  );
  return l(a);
}
async function I(t) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/active/${encodeURIComponent(t)}`
    })
  );
  return a.response.status === 404 ? null : l(a);
}
async function R(t) {
  const a = await s(
    () => r.post({ security: i, throwOnError: !1, url: `${n}/configurations`, body: t })
  );
  return l(a);
}
async function U(t, a) {
  const e = await s(
    () => r.put({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(t)}`,
      body: a
    })
  );
  return l(e);
}
async function b(t) {
  const a = await s(
    () => r.post({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(t)}/activate`
    })
  );
  return l(a);
}
async function T(t) {
  const a = await s(
    () => r.delete({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(t)}`
    })
  );
  if (!a.response.ok || a.error !== void 0) throw y(a);
}
async function N(t, a = null) {
  const e = a !== null ? `?culture=${encodeURIComponent(a)}` : "", o = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/evaluate/cached/${encodeURIComponent(t)}${e}`
    })
  );
  return o.response.status === 404 ? null : l(o);
}
async function _(t) {
  const a = await s(
    () => r.post({ security: i, throwOnError: !1, url: `${n}/evaluate`, body: t })
  );
  return l(a);
}
async function S(t) {
  const a = await s(
    () => r.post({ security: i, throwOnError: !1, url: `${n}/recommend`, body: t })
  );
  return l(a);
}
async function j(t) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/profiles/${encodeURIComponent(t)}/sampling-support`
    })
  );
  return l(a);
}
async function F(t) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/profiles/${encodeURIComponent(t)}/system-prompt`
    })
  );
  return l(a);
}
async function M(t) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/document-type/${encodeURIComponent(t)}/properties`
    })
  ), e = l(a);
  return {
    name: e.name,
    properties: e.properties.map((o) => ({
      alias: o.alias,
      label: o.label,
      groupName: o.groupName,
      editorAlias: o.editorAlias
    }))
  };
}
const f = "ProWorks.AI.PageEvaluator.Condition.HasActiveConfig";
class k extends P {
  constructor(a, e) {
    super(a, e), this.permitted = !1, this.consumeContext(v, (o) => {
      if (!o) {
        this.permitted = !1;
        return;
      }
      const u = o.structure.getOwnerContentType()?.alias ?? "";
      if (!u) {
        this.permitted = !1;
        return;
      }
      I(u).then((d) => {
        this.permitted = d !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const C = "Uai.Menu.Addons", m = [
  // ---------------------------------------------------------------------------
  // Localization: English default translations for all package UI strings.
  // ---------------------------------------------------------------------------
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.En",
    name: "Page Evaluator English Localization",
    meta: {
      culture: "en"
    },
    js: () => import("./en-BHMbEn_Y.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Es",
    name: "Page Evaluator Spanish Localization",
    meta: {
      culture: "es"
    },
    js: () => import("./es-hVlbBjTn.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Fr",
    name: "Page Evaluator French Localization",
    meta: {
      culture: "fr"
    },
    js: () => import("./fr-DbIBlkhI.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Da",
    name: "Page Evaluator Danish Localization",
    meta: {
      culture: "da"
    },
    js: () => import("./da-1Hgnr8F8.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.De",
    name: "Page Evaluator German Localization",
    meta: {
      culture: "de"
    },
    js: () => import("./de-Be0TH_MZ.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Nb",
    name: "Page Evaluator Norwegian Localization",
    meta: {
      culture: "nb"
    },
    js: () => import("./nb-CLMRL80A.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Sv",
    name: "Page Evaluator Swedish Localization",
    meta: {
      culture: "sv"
    },
    js: () => import("./sv-CgAT5mWD.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.It",
    name: "Page Evaluator Italian Localization",
    meta: {
      culture: "it"
    },
    js: () => import("./it-DfSNPJJK.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Hi",
    name: "Page Evaluator Hindi Localization",
    meta: {
      culture: "hi"
    },
    js: () => import("./hi-BZyNBgn-.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Pt",
    name: "Page Evaluator Portuguese Localization",
    meta: {
      culture: "pt"
    },
    js: () => import("./pt-NF3ppP2K.js")
  },
  // ---------------------------------------------------------------------------
  // US1 — Content Editor Evaluates a Page
  // ---------------------------------------------------------------------------
  // Condition: resolves true only when an active evaluator config exists for
  // the current document type. Registered before the workspaceAction so it is
  // available when the action's conditions are evaluated.
  {
    type: "condition",
    alias: f,
    name: "Page Evaluator Has Active Config Condition",
    api: k
  },
  {
    type: "workspaceAction",
    kind: "default",
    alias: "ProWorks.AI.PageEvaluator.WorkspaceAction",
    name: "Page Evaluator Workspace Action",
    api: () => import("./page-evaluator-action.api-CT9qY17-.js"),
    meta: {
      label: "Evaluate Page",
      look: "secondary"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Umb.Workspace.Document"
      },
      {
        alias: f
      }
    ]
  },
  {
    type: "modal",
    alias: "ProWorks.AI.PageEvaluator.Modal.Evaluation",
    name: "Page Evaluator Evaluation Modal",
    element: () => import("./evaluation-modal.element-hpH5lzHq.js").then((t) => ({
      element: t.EvaluationModalElement
    }))
  },
  // ---------------------------------------------------------------------------
  // US2 — Administrator Configures Evaluator per Document Type
  // ---------------------------------------------------------------------------
  {
    type: "menuItem",
    alias: "ProWorks.AI.PageEvaluator.MenuItem",
    name: "Page Evaluator Menu Item",
    meta: {
      label: "Page Evaluator",
      icon: "icon-settings",
      entityType: "evaluator-config",
      menus: [C]
    }
  },
  {
    type: "workspace",
    alias: "ProWorks.AI.PageEvaluator.Workspace",
    name: "Page Evaluator Workspace",
    meta: {
      entityType: "evaluator-config"
    },
    element: () => import("./evaluator-config-workspace.element-BT3qAVHk.js").then((t) => ({
      element: t.EvaluatorConfigWorkspaceElement
    }))
  },
  // ---------------------------------------------------------------------------
  // Umbraco.AI Tests integration — entity picker repository for the test runner
  // ---------------------------------------------------------------------------
  // Provides the list of AIEvaluatorConfig entities for the "Target" picker
  // when creating a test with the "Page Evaluator Test" feature.
  // Discovery: the test runner searches for repositories with
  //   alias starting "Uai.Repository.TestFeatureEntity." AND meta.feature matching our feature ID.
  {
    type: "repository",
    alias: "Uai.Repository.TestFeatureEntity.ProworksPageEvaluator",
    name: "Page Evaluator Test Feature Entity Repository",
    meta: {
      feature: "proworks-page-evaluator"
    },
    api: () => import("./page-evaluator-test-entity.repository-Bdc-i1I_.js")
  },
  {
    type: "workspaceView",
    alias: "ProWorks.AI.PageEvaluator.Workspace.Form",
    name: "Page Evaluator Form View",
    meta: {
      label: "Configuration",
      pathname: "edit",
      icon: "icon-settings"
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "ProWorks.AI.PageEvaluator.Workspace"
      }
    ],
    element: () => import("./evaluator-form.element-DsFeR7R1.js").then((t) => ({
      element: t.EvaluatorFormElement
    }))
  }
], D = () => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", m.length, "extensions"), E.registerMany(m);
}, B = () => {
  for (const t of m)
    E.unregister(t.alias);
};
export {
  c as A,
  i as B,
  $ as a,
  b,
  L as c,
  T as d,
  _ as e,
  M as f,
  N as g,
  r as h,
  F as i,
  j,
  R as k,
  B as l,
  D as o,
  S as r,
  U as u
};
//# sourceMappingURL=entry-point-BftmZJyD.js.map
