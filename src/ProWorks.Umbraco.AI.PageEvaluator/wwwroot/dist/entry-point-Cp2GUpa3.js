import { UmbConditionBase as f, umbExtensionsRegistry as m } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as d } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as y } from "@umbraco-cms/backoffice/http-client";
const n = y, r = "/umbraco/management/api/v1/page-evaluator", s = [{ scheme: "bearer", type: "http" }];
class E extends Error {
  constructor(t, a) {
    super(`API error ${t}: ${a}`), this.status = t, this.detail = a;
  }
}
async function i(e) {
  if (!e.response.ok) {
    const t = e.error, o = (t !== null && typeof t == "object" && "title" in t && typeof t.title == "string" ? t.title : null) ?? (t ? JSON.stringify(t) : `HTTP ${e.response.status}`);
    throw new E(e.response.status, o);
  }
  return e.data;
}
async function k() {
  const e = await n.get({
    security: s,
    url: `${r}/configurations`
  });
  return i(e);
}
async function w(e) {
  const t = await n.get({
    security: s,
    url: `${r}/configurations/${encodeURIComponent(e)}`
  });
  return i(t);
}
async function v(e) {
  const t = await n.get({
    security: s,
    url: `${r}/configurations/active/${encodeURIComponent(e)}`
  });
  return t.response.status === 404 ? null : i(t);
}
async function $(e) {
  const t = await n.post({
    security: s,
    url: `${r}/configurations`,
    body: e
  });
  return i(t);
}
async function W(e, t) {
  const a = await n.put({
    security: s,
    url: `${r}/configurations/${encodeURIComponent(e)}`,
    body: t
  });
  return i(a);
}
async function b(e) {
  const t = await n.post({
    security: s,
    url: `${r}/configurations/${encodeURIComponent(e)}/activate`
  });
  return i(t);
}
async function U(e) {
  const t = await n.delete({
    security: s,
    url: `${r}/configurations/${encodeURIComponent(e)}`
  });
  if (!t.response.ok) {
    const a = await t.response.text().catch(() => "");
    throw new Error(`API ${t.response.status}: ${a}`);
  }
}
async function R(e) {
  const t = await n.get({
    security: s,
    url: `${r}/evaluate/cached/${encodeURIComponent(e)}`
  });
  return t.response.status === 404 ? null : i(t);
}
async function _(e) {
  const t = await n.post({
    security: s,
    url: `${r}/evaluate`,
    body: e
  });
  return i(t);
}
async function T(e) {
  const t = await n.get({
    security: s,
    url: `${r}/document-type/${encodeURIComponent(e)}/properties`
  });
  if (!t.response.ok) {
    const o = await t.response.text().catch(() => "");
    throw new Error(`API ${t.response.status}: ${o}`);
  }
  const a = t.data;
  return {
    name: a.name,
    properties: a.properties.map((o) => ({
      alias: o.alias,
      label: o.label,
      groupName: o.groupName,
      editorAlias: o.editorAlias
    }))
  };
}
const p = "ProWorks.AI.PageEvaluator.Condition.HasActiveConfig";
class P extends f {
  constructor(t, a) {
    super(t, a), this.permitted = !1, this.consumeContext(d, (o) => {
      var l;
      if (!o) {
        this.permitted = !1;
        return;
      }
      const c = ((l = o.structure.getOwnerContentType()) == null ? void 0 : l.alias) ?? "";
      if (!c) {
        this.permitted = !1;
        return;
      }
      v(c).then((g) => {
        this.permitted = g !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const A = "Uai.Menu.Addons", u = [
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
    js: () => import("./en-d3fnpqoD.js")
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
    api: P
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
    element: () => import("./evaluation-modal.element-BdVlRtc6.js").then((e) => ({
      element: e.EvaluationModalElement
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
      menus: [A]
    }
  },
  {
    type: "workspace",
    alias: "ProWorks.AI.PageEvaluator.Workspace",
    name: "Page Evaluator Workspace",
    meta: {
      entityType: "evaluator-config"
    },
    element: () => import("./evaluator-config-workspace.element-B0uiRCvw.js").then((e) => ({
      element: e.EvaluatorConfigWorkspaceElement
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
    api: () => import("./page-evaluator-test-entity.repository-BviZh54k.js")
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
    element: () => import("./evaluator-form.element-DpaZ7cNf.js").then((e) => ({
      element: e.EvaluatorFormElement
    }))
  }
], O = (e) => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", u.length, "extensions"), m.registerMany(u);
}, x = (e, t) => {
  for (const a of u)
    m.unregister(a.alias);
};
export {
  s as B,
  k as a,
  b,
  w as c,
  U as d,
  _ as e,
  T as f,
  R as g,
  n as h,
  $ as i,
  x as j,
  O as o,
  W as u
};
//# sourceMappingURL=entry-point-Cp2GUpa3.js.map
