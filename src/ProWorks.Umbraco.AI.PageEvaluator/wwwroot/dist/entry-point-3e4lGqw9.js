import { UmbConditionBase as P, umbExtensionsRegistry as g } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as d } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as v } from "@umbraco-cms/backoffice/http-client";
const r = v, n = "/umbraco/management/api/v1/page-evaluator", i = [{ scheme: "bearer", type: "http" }], h = "NetworkError";
class E extends Error {
  constructor(a, o, e = null, u = null) {
    super(`API ${a}: ${o}`), this.status = a, this.detail = o, this.category = e, this.type = u;
  }
}
function c(t, a) {
  if (t === null || typeof t != "object" || !(a in t)) return null;
  const o = t[a];
  return typeof o == "string" ? o : null;
}
function f(t) {
  const a = t.error, e = c(a, "title") ?? (typeof a == "string" && a.length > 0 ? a : a ? JSON.stringify(a) : `HTTP ${t.response.status}`);
  return new E(t.response.status, e, c(a, "category"), c(a, "type"));
}
function l(t) {
  if (!t.response.ok) throw f(t);
  return t.data;
}
async function s(t) {
  try {
    return await t();
  } catch (a) {
    throw a instanceof TypeError ? new E(0, a.message, null, h) : a;
  }
}
async function z() {
  const t = await s(
    () => r.get({ security: i, throwOnError: !1, url: `${n}/configurations` })
  );
  return l(t);
}
async function O(t) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(t)}`
    })
  );
  return l(a);
}
async function A(t) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/active/${encodeURIComponent(t)}`
    })
  );
  return a.response.status === 404 ? null : l(a);
}
async function $(t) {
  const a = await s(
    () => r.post({ security: i, throwOnError: !1, url: `${n}/configurations`, body: t })
  );
  return l(a);
}
async function L(t, a) {
  const o = await s(
    () => r.put({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(t)}`,
      body: a
    })
  );
  return l(o);
}
async function R(t) {
  const a = await s(
    () => r.post({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(t)}/activate`
    })
  );
  return l(a);
}
async function b(t) {
  const a = await s(
    () => r.delete({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(t)}`
    })
  );
  if (!a.response.ok) throw f(a);
}
async function U(t, a = null) {
  const o = a !== null ? `?culture=${encodeURIComponent(a)}` : "", e = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/evaluate/cached/${encodeURIComponent(t)}${o}`
    })
  );
  return e.response.status === 404 ? null : l(e);
}
async function T(t) {
  const a = await s(
    () => r.post({ security: i, throwOnError: !1, url: `${n}/evaluate`, body: t })
  );
  return l(a);
}
async function N(t) {
  const a = await s(
    () => r.post({ security: i, throwOnError: !1, url: `${n}/recommend`, body: t })
  );
  return l(a);
}
async function _(t) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/profiles/${encodeURIComponent(t)}/sampling-support`
    })
  );
  return l(a);
}
async function j(t) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/document-type/${encodeURIComponent(t)}/properties`
    })
  ), o = l(a);
  return {
    name: o.name,
    properties: o.properties.map((e) => ({
      alias: e.alias,
      label: e.label,
      groupName: e.groupName,
      editorAlias: e.editorAlias
    }))
  };
}
const m = "ProWorks.AI.PageEvaluator.Condition.HasActiveConfig";
class I extends P {
  constructor(a, o) {
    super(a, o), this.permitted = !1, this.consumeContext(d, (e) => {
      if (!e) {
        this.permitted = !1;
        return;
      }
      const u = e.structure.getOwnerContentType()?.alias ?? "";
      if (!u) {
        this.permitted = !1;
        return;
      }
      A(u).then((y) => {
        this.permitted = y !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const w = "Uai.Menu.Addons", p = [
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
    js: () => import("./en-BDIBgbH6.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Es",
    name: "Page Evaluator Spanish Localization",
    meta: {
      culture: "es"
    },
    js: () => import("./es-DiCEC6rf.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Fr",
    name: "Page Evaluator French Localization",
    meta: {
      culture: "fr"
    },
    js: () => import("./fr-Y5CAAHjl.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Da",
    name: "Page Evaluator Danish Localization",
    meta: {
      culture: "da"
    },
    js: () => import("./da-5qryvHat.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.De",
    name: "Page Evaluator German Localization",
    meta: {
      culture: "de"
    },
    js: () => import("./de-Dre3Wgo1.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Nb",
    name: "Page Evaluator Norwegian Localization",
    meta: {
      culture: "nb"
    },
    js: () => import("./nb-J9PWw749.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Sv",
    name: "Page Evaluator Swedish Localization",
    meta: {
      culture: "sv"
    },
    js: () => import("./sv-Byzw-3gF.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.It",
    name: "Page Evaluator Italian Localization",
    meta: {
      culture: "it"
    },
    js: () => import("./it-DmhaUUjd.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Hi",
    name: "Page Evaluator Hindi Localization",
    meta: {
      culture: "hi"
    },
    js: () => import("./hi-DfH4Xhuf.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Pt",
    name: "Page Evaluator Portuguese Localization",
    meta: {
      culture: "pt"
    },
    js: () => import("./pt-DkZX2xNX.js")
  },
  // ---------------------------------------------------------------------------
  // US1 — Content Editor Evaluates a Page
  // ---------------------------------------------------------------------------
  // Condition: resolves true only when an active evaluator config exists for
  // the current document type. Registered before the workspaceAction so it is
  // available when the action's conditions are evaluated.
  {
    type: "condition",
    alias: m,
    name: "Page Evaluator Has Active Config Condition",
    api: I
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
        alias: m
      }
    ]
  },
  {
    type: "modal",
    alias: "ProWorks.AI.PageEvaluator.Modal.Evaluation",
    name: "Page Evaluator Evaluation Modal",
    element: () => import("./evaluation-modal.element--7gRukFX.js").then((t) => ({
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
      menus: [w]
    }
  },
  {
    type: "workspace",
    alias: "ProWorks.AI.PageEvaluator.Workspace",
    name: "Page Evaluator Workspace",
    meta: {
      entityType: "evaluator-config"
    },
    element: () => import("./evaluator-config-workspace.element-DSUy-2F9.js").then((t) => ({
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
    api: () => import("./page-evaluator-test-entity.repository-Pmrjm8NC.js")
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
    element: () => import("./evaluator-form.element-DtVN8h3e.js").then((t) => ({
      element: t.EvaluatorFormElement
    }))
  }
], S = () => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", p.length, "extensions"), g.registerMany(p);
}, M = () => {
  for (const t of p)
    g.unregister(t.alias);
};
export {
  E as A,
  i as B,
  z as a,
  R as b,
  O as c,
  b as d,
  T as e,
  j as f,
  U as g,
  r as h,
  _ as i,
  $ as j,
  M as k,
  S as o,
  N as r,
  L as u
};
//# sourceMappingURL=entry-point-3e4lGqw9.js.map
