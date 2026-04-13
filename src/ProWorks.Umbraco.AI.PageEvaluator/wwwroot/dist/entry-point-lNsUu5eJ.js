import { UmbConditionBase as f, umbExtensionsRegistry as g } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as d } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as E } from "@umbraco-cms/backoffice/http-client";
const a = E, o = "/umbraco/management/api/v1/page-evaluator", n = [{ scheme: "bearer", type: "http" }];
async function r(t) {
  if (!t.response.ok) {
    const e = t.error ? JSON.stringify(t.error) : `HTTP ${t.response.status}`;
    throw new Error(`API error: ${e}`);
  }
  return t.data;
}
async function h() {
  const t = await a.get({
    security: n,
    url: `${o}/configurations`
  });
  return r(t);
}
async function k(t) {
  const e = await a.get({
    security: n,
    url: `${o}/configurations/${encodeURIComponent(t)}`
  });
  return r(e);
}
async function v(t) {
  const e = await a.get({
    security: n,
    url: `${o}/configurations/active/${encodeURIComponent(t)}`
  });
  return e.response.status === 404 ? null : r(e);
}
async function W(t) {
  const e = await a.post({
    security: n,
    url: `${o}/configurations`,
    body: t
  });
  return r(e);
}
async function w(t, e) {
  const i = await a.put({
    security: n,
    url: `${o}/configurations/${encodeURIComponent(t)}`,
    body: e
  });
  return r(i);
}
async function $(t) {
  const e = await a.post({
    security: n,
    url: `${o}/configurations/${encodeURIComponent(t)}/activate`
  });
  return r(e);
}
async function U(t) {
  const e = await a.delete({
    security: n,
    url: `${o}/configurations/${encodeURIComponent(t)}`
  });
  if (!e.response.ok) {
    const i = await e.response.text().catch(() => "");
    throw new Error(`API ${e.response.status}: ${i}`);
  }
}
async function b(t) {
  const e = await a.get({
    security: n,
    url: `${o}/evaluate/cached/${encodeURIComponent(t)}`
  });
  return e.response.status === 404 ? null : r(e);
}
async function R(t) {
  const e = await a.post({
    security: n,
    url: `${o}/evaluate`,
    body: t
  });
  return r(e);
}
const m = "ProWorks.AI.PageEvaluator.Condition.HasActiveConfig";
class y extends f {
  constructor(e, i) {
    super(e, i), this.permitted = !1, this.consumeContext(d, (c) => {
      var l;
      if (!c) {
        this.permitted = !1;
        return;
      }
      const u = ((l = c.structure.getOwnerContentType()) == null ? void 0 : l.alias) ?? "";
      if (!u) {
        this.permitted = !1;
        return;
      }
      v(u).then((p) => {
        this.permitted = p !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const C = "Uai.Menu.Addons", s = [
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
    js: () => import("./en-BBAB3RCF.js")
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
    api: y
  },
  {
    type: "workspaceAction",
    kind: "default",
    alias: "ProWorks.AI.PageEvaluator.WorkspaceAction",
    name: "Page Evaluator Workspace Action",
    api: () => import("./page-evaluator-action.api-_P8W7Noa.js"),
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
    element: () => import("./evaluation-modal.element-lUenJXrk.js").then((t) => ({
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
    element: () => import("./evaluator-config-workspace.element-IWRXP2ak.js").then((t) => ({
      element: t.EvaluatorConfigWorkspaceElement
    }))
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
    element: () => import("./evaluator-form.element-Bjx1aF-I.js").then((t) => ({
      element: t.EvaluatorFormElement
    }))
  }
], _ = (t) => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", s.length, "extensions"), g.registerMany(s);
}, O = (t, e) => {
  for (const i of s)
    g.unregister(i.alias);
};
export {
  n as B,
  h as a,
  $ as b,
  a as c,
  U as d,
  R as e,
  k as f,
  b as g,
  W as h,
  O as i,
  _ as o,
  w as u
};
//# sourceMappingURL=entry-point-lNsUu5eJ.js.map
