import { UmbConditionBase as f, umbExtensionsRegistry as p } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as d } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as v } from "@umbraco-cms/backoffice/http-client";
const a = v, o = "/umbraco/management/api/v1/page-evaluator", n = [{ scheme: "bearer", type: "http" }];
async function s(t) {
  if (!t.response.ok) {
    const e = await t.response.text().catch(() => "");
    throw new Error(`API ${t.response.status}: ${e}`);
  }
  return t.data;
}
async function h() {
  const t = await a.get({
    security: n,
    url: `${o}/configurations`
  });
  return s(t);
}
async function k(t) {
  const e = await a.get({
    security: n,
    url: `${o}/configurations/${encodeURIComponent(t)}`
  });
  return s(e);
}
async function y(t) {
  const e = await a.get({
    security: n,
    url: `${o}/configurations/active/${encodeURIComponent(t)}`
  });
  return e.response.status === 404 ? null : s(e);
}
async function w(t) {
  const e = await a.post({
    security: n,
    url: `${o}/configurations`,
    body: t
  });
  return s(e);
}
async function W(t, e) {
  const i = await a.put({
    security: n,
    url: `${o}/configurations/${encodeURIComponent(t)}`,
    body: e
  });
  return s(i);
}
async function $(t) {
  const e = await a.post({
    security: n,
    url: `${o}/configurations/${encodeURIComponent(t)}/activate`
  });
  return s(e);
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
  return e.response.status === 404 ? null : s(e);
}
async function R(t) {
  const e = await a.post({
    security: n,
    url: `${o}/evaluate`,
    body: t
  });
  return s(e);
}
const m = "ProWorks.AI.PageEvaluator.Condition.HasActiveConfig";
class E extends f {
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
      y(u).then((g) => {
        this.permitted = g !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const C = "Uai.Menu.Addons", r = [
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
    api: E
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
    element: () => import("./evaluation-modal.element-kCXq-xj0.js").then((t) => ({
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
    element: () => import("./evaluator-config-workspace.element-BLppKR9l.js").then((t) => ({
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
    element: () => import("./evaluator-form.element-D9PCb31F.js").then((t) => ({
      element: t.EvaluatorFormElement
    }))
  }
], _ = (t) => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", r.length, "extensions"), p.registerMany(r);
}, M = () => {
  for (const t of r)
    p.unregister(t.alias);
};
export {
  h as a,
  $ as b,
  a as c,
  U as d,
  R as e,
  k as f,
  b as g,
  w as h,
  M as i,
  _ as o,
  W as u
};
//# sourceMappingURL=entry-point-8sa3rU5d.js.map
