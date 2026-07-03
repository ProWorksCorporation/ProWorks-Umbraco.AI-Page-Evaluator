import { UmbConditionBase as g, umbExtensionsRegistry as p } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as y } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as f } from "@umbraco-cms/backoffice/http-client";
const n = f, r = "/umbraco/management/api/v1/page-evaluator", s = [{ scheme: "bearer", type: "http" }];
class d extends Error {
  constructor(t, a, o = null) {
    super(`API error ${t}: ${a}`), this.status = t, this.detail = a, this.category = o;
  }
}
async function i(e) {
  if (!e.response.ok) {
    const t = e.error, a = t !== null && typeof t == "object" && "title" in t && typeof t.title == "string" ? t.title : null, o = t !== null && typeof t == "object" && "category" in t && typeof t.category == "string" ? t.category : null, c = a ?? (t ? JSON.stringify(t) : `HTTP ${e.response.status}`);
    throw new d(e.response.status, c, o);
  }
  return e.data;
}
async function I() {
  const e = await n.get({
    security: s,
    url: `${r}/configurations`
  });
  return i(e);
}
async function k(e) {
  const t = await n.get({
    security: s,
    url: `${r}/configurations/${encodeURIComponent(e)}`
  });
  return i(t);
}
async function E(e) {
  const t = await n.get({
    security: s,
    url: `${r}/configurations/active/${encodeURIComponent(e)}`
  });
  return t.response.status === 404 ? null : i(t);
}
async function w(e) {
  const t = await n.post({
    security: s,
    url: `${r}/configurations`,
    body: e
  });
  return i(t);
}
async function $(e, t) {
  const a = await n.put({
    security: s,
    url: `${r}/configurations/${encodeURIComponent(e)}`,
    body: t
  });
  return i(a);
}
async function W(e) {
  const t = await n.post({
    security: s,
    url: `${r}/configurations/${encodeURIComponent(e)}/activate`
  });
  return i(t);
}
async function b(e) {
  const t = await n.delete({
    security: s,
    url: `${r}/configurations/${encodeURIComponent(e)}`
  });
  if (!t.response.ok) {
    const a = await t.response.text().catch(() => "");
    throw new Error(`API ${t.response.status}: ${a}`);
  }
}
async function U(e) {
  const t = await n.get({
    security: s,
    url: `${r}/evaluate/cached/${encodeURIComponent(e)}`
  });
  return t.response.status === 404 ? null : i(t);
}
async function R(e) {
  const t = await n.post({
    security: s,
    url: `${r}/evaluate`,
    body: e
  });
  return i(t);
}
async function _(e) {
  const t = await n.post({
    security: s,
    url: `${r}/recommend`,
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
const l = "ProWorks.AI.PageEvaluator.Condition.HasActiveConfig";
class v extends g {
  constructor(t, a) {
    super(t, a), this.permitted = !1, this.consumeContext(y, (o) => {
      if (!o) {
        this.permitted = !1;
        return;
      }
      const c = o.structure.getOwnerContentType()?.alias ?? "";
      if (!c) {
        this.permitted = !1;
        return;
      }
      E(c).then((m) => {
        this.permitted = m !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const P = "Uai.Menu.Addons", u = [
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
    js: () => import("./en-DMWtIcSu.js")
  },
  // ---------------------------------------------------------------------------
  // US1 — Content Editor Evaluates a Page
  // ---------------------------------------------------------------------------
  // Condition: resolves true only when an active evaluator config exists for
  // the current document type. Registered before the workspaceAction so it is
  // available when the action's conditions are evaluated.
  {
    type: "condition",
    alias: l,
    name: "Page Evaluator Has Active Config Condition",
    api: v
  },
  {
    type: "workspaceAction",
    kind: "default",
    alias: "ProWorks.AI.PageEvaluator.WorkspaceAction",
    name: "Page Evaluator Workspace Action",
    api: () => import("./page-evaluator-action.api-hQnkV95R.js"),
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
        alias: l
      }
    ]
  },
  {
    type: "modal",
    alias: "ProWorks.AI.PageEvaluator.Modal.Evaluation",
    name: "Page Evaluator Evaluation Modal",
    element: () => import("./evaluation-modal.element-DHJ0UZEa.js").then((e) => ({
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
    element: () => import("./evaluator-config-workspace.element-Ck7HQCae.js").then((e) => ({
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
    api: () => import("./page-evaluator-test-entity.repository-Br4iQFV2.js")
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
    element: () => import("./evaluator-form.element-BRKDFfBO.js").then((e) => ({
      element: e.EvaluatorFormElement
    }))
  }
], O = (e) => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", u.length, "extensions"), p.registerMany(u);
}, x = (e, t) => {
  for (const a of u)
    p.unregister(a.alias);
};
export {
  d as A,
  s as B,
  I as a,
  W as b,
  k as c,
  b as d,
  R as e,
  T as f,
  U as g,
  n as h,
  w as i,
  x as j,
  O as o,
  _ as r,
  $ as u
};
//# sourceMappingURL=entry-point-Dgd6d9p3.js.map
