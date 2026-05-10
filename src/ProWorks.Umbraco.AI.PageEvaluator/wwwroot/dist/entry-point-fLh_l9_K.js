import { UmbConditionBase as f, umbExtensionsRegistry as m } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as d } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as y } from "@umbraco-cms/backoffice/http-client";
const o = y, n = "/umbraco/management/api/v1/page-evaluator", r = [{ scheme: "bearer", type: "http" }];
async function i(t) {
  if (!t.response.ok) {
    const e = t.error ? JSON.stringify(t.error) : `HTTP ${t.response.status}`;
    throw new Error(`API error: ${e}`);
  }
  return t.data;
}
async function h() {
  const t = await o.get({
    security: r,
    url: `${n}/configurations`
  });
  return i(t);
}
async function k(t) {
  const e = await o.get({
    security: r,
    url: `${n}/configurations/${encodeURIComponent(t)}`
  });
  return i(e);
}
async function E(t) {
  const e = await o.get({
    security: r,
    url: `${n}/configurations/active/${encodeURIComponent(t)}`
  });
  return e.response.status === 404 ? null : i(e);
}
async function w(t) {
  const e = await o.post({
    security: r,
    url: `${n}/configurations`,
    body: t
  });
  return i(e);
}
async function $(t, e) {
  const a = await o.put({
    security: r,
    url: `${n}/configurations/${encodeURIComponent(t)}`,
    body: e
  });
  return i(a);
}
async function W(t) {
  const e = await o.post({
    security: r,
    url: `${n}/configurations/${encodeURIComponent(t)}/activate`
  });
  return i(e);
}
async function b(t) {
  const e = await o.delete({
    security: r,
    url: `${n}/configurations/${encodeURIComponent(t)}`
  });
  if (!e.response.ok) {
    const a = await e.response.text().catch(() => "");
    throw new Error(`API ${e.response.status}: ${a}`);
  }
}
async function U(t) {
  const e = await o.get({
    security: r,
    url: `${n}/evaluate/cached/${encodeURIComponent(t)}`
  });
  return e.response.status === 404 ? null : i(e);
}
async function R(t) {
  const e = await o.post({
    security: r,
    url: `${n}/evaluate`,
    body: t
  });
  return i(e);
}
async function _(t) {
  const e = await o.get({
    security: r,
    url: `${n}/document-type/${encodeURIComponent(t)}/properties`
  });
  if (!e.response.ok) {
    const s = await e.response.text().catch(() => "");
    throw new Error(`API ${e.response.status}: ${s}`);
  }
  const a = e.data;
  return {
    name: a.name,
    properties: a.properties.map((s) => ({
      alias: s.alias,
      label: s.label,
      groupName: s.groupName,
      editorAlias: s.editorAlias
    }))
  };
}
const p = "ProWorks.AI.PageEvaluator.Condition.HasActiveConfig";
class v extends f {
  constructor(e, a) {
    super(e, a), this.permitted = !1, this.consumeContext(d, (s) => {
      var l;
      if (!s) {
        this.permitted = !1;
        return;
      }
      const u = ((l = s.structure.getOwnerContentType()) == null ? void 0 : l.alias) ?? "";
      if (!u) {
        this.permitted = !1;
        return;
      }
      E(u).then((g) => {
        this.permitted = g !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const P = "Uai.Menu.Addons", c = [
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
    js: () => import("./en-DdA0pv8A.js")
  },
  // ---------------------------------------------------------------------------
  // US1 — Content Editor Evaluates a Page
  // ---------------------------------------------------------------------------
  // Condition: resolves true only when an active evaluator config exists for
  // the current document type. Registered before the workspaceAction so it is
  // available when the action's conditions are evaluated.
  {
    type: "condition",
    alias: p,
    name: "Page Evaluator Has Active Config Condition",
    api: v
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
        alias: p
      }
    ]
  },
  {
    type: "modal",
    alias: "ProWorks.AI.PageEvaluator.Modal.Evaluation",
    name: "Page Evaluator Evaluation Modal",
    element: () => import("./evaluation-modal.element-D_gdYZeG.js").then((t) => ({
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
      menus: [P]
    }
  },
  {
    type: "workspace",
    alias: "ProWorks.AI.PageEvaluator.Workspace",
    name: "Page Evaluator Workspace",
    meta: {
      entityType: "evaluator-config"
    },
    element: () => import("./evaluator-config-workspace.element-Bsmo4hzd.js").then((t) => ({
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
    element: () => import("./evaluator-form.element-Bw9v9xf5.js").then((t) => ({
      element: t.EvaluatorFormElement
    }))
  }
], O = (t) => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", c.length, "extensions"), m.registerMany(c);
}, T = (t, e) => {
  for (const a of c)
    m.unregister(a.alias);
};
export {
  r as B,
  h as a,
  W as b,
  k as c,
  b as d,
  R as e,
  _ as f,
  U as g,
  o as h,
  w as i,
  T as j,
  O as o,
  $ as u
};
//# sourceMappingURL=entry-point-fLh_l9_K.js.map
