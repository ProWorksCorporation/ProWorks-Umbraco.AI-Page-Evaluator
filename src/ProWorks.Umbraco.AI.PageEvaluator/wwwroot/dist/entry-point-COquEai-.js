import { UmbConditionBase as g, umbExtensionsRegistry as p } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as y } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as P } from "@umbraco-cms/backoffice/http-client";
const n = P, r = "/umbraco/management/api/v1/page-evaluator", i = [{ scheme: "bearer", type: "http" }];
class E extends Error {
  constructor(a, e, o = null) {
    super(`API error ${a}: ${e}`), this.status = a, this.detail = e, this.category = o;
  }
}
async function s(t) {
  if (!t.response.ok) {
    const a = t.error, e = a !== null && typeof a == "object" && "title" in a && typeof a.title == "string" ? a.title : null, o = a !== null && typeof a == "object" && "category" in a && typeof a.category == "string" ? a.category : null, l = e ?? (a ? JSON.stringify(a) : `HTTP ${t.response.status}`);
    throw new E(t.response.status, l, o);
  }
  return t.data;
}
async function k() {
  const t = await n.get({
    security: i,
    url: `${r}/configurations`
  });
  return s(t);
}
async function C(t) {
  const a = await n.get({
    security: i,
    url: `${r}/configurations/${encodeURIComponent(t)}`
  });
  return s(a);
}
async function v(t) {
  const a = await n.get({
    security: i,
    url: `${r}/configurations/active/${encodeURIComponent(t)}`
  });
  return a.response.status === 404 ? null : s(a);
}
async function z(t) {
  const a = await n.post({
    security: i,
    url: `${r}/configurations`,
    body: t
  });
  return s(a);
}
async function W(t, a) {
  const e = await n.put({
    security: i,
    url: `${r}/configurations/${encodeURIComponent(t)}`,
    body: a
  });
  return s(e);
}
async function w(t) {
  const a = await n.post({
    security: i,
    url: `${r}/configurations/${encodeURIComponent(t)}/activate`
  });
  return s(a);
}
async function $(t) {
  const a = await n.delete({
    security: i,
    url: `${r}/configurations/${encodeURIComponent(t)}`
  });
  if (!a.response.ok) {
    const e = await a.response.text().catch(() => "");
    throw new Error(`API ${a.response.status}: ${e}`);
  }
}
async function b(t) {
  const a = await n.get({
    security: i,
    url: `${r}/evaluate/cached/${encodeURIComponent(t)}`
  });
  return a.response.status === 404 ? null : s(a);
}
async function L(t) {
  const a = await n.post({
    security: i,
    url: `${r}/evaluate`,
    body: t
  });
  return s(a);
}
async function U(t) {
  const a = await n.post({
    security: i,
    url: `${r}/recommend`,
    body: t
  });
  return s(a);
}
async function R(t) {
  const a = await n.get({
    security: i,
    url: `${r}/document-type/${encodeURIComponent(t)}/properties`
  });
  if (!a.response.ok) {
    const o = await a.response.text().catch(() => "");
    throw new Error(`API ${a.response.status}: ${o}`);
  }
  const e = a.data;
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
const u = "ProWorks.AI.PageEvaluator.Condition.HasActiveConfig";
class f extends g {
  constructor(a, e) {
    super(a, e), this.permitted = !1, this.consumeContext(y, (o) => {
      if (!o) {
        this.permitted = !1;
        return;
      }
      const l = o.structure.getOwnerContentType()?.alias ?? "";
      if (!l) {
        this.permitted = !1;
        return;
      }
      v(l).then((m) => {
        this.permitted = m !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const d = "Uai.Menu.Addons", c = [
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
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Es",
    name: "Page Evaluator Spanish Localization",
    meta: {
      culture: "es"
    },
    js: () => import("./es-CKPvPbeA.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Fr",
    name: "Page Evaluator French Localization",
    meta: {
      culture: "fr"
    },
    js: () => import("./fr-CqN3hDFA.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Da",
    name: "Page Evaluator Danish Localization",
    meta: {
      culture: "da"
    },
    js: () => import("./da-C0gvm61u.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.De",
    name: "Page Evaluator German Localization",
    meta: {
      culture: "de"
    },
    js: () => import("./de-M8T2PJpY.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Nb",
    name: "Page Evaluator Norwegian Localization",
    meta: {
      culture: "nb"
    },
    js: () => import("./nb-KGQL_anc.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Sv",
    name: "Page Evaluator Swedish Localization",
    meta: {
      culture: "sv"
    },
    js: () => import("./sv-By7TTUDN.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.It",
    name: "Page Evaluator Italian Localization",
    meta: {
      culture: "it"
    },
    js: () => import("./it-7wkO7f2f.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Hi",
    name: "Page Evaluator Hindi Localization",
    meta: {
      culture: "hi"
    },
    js: () => import("./hi-Drdztl0c.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Pt",
    name: "Page Evaluator Portuguese Localization",
    meta: {
      culture: "pt"
    },
    js: () => import("./pt-Ck0uCF5J.js")
  },
  // ---------------------------------------------------------------------------
  // US1 — Content Editor Evaluates a Page
  // ---------------------------------------------------------------------------
  // Condition: resolves true only when an active evaluator config exists for
  // the current document type. Registered before the workspaceAction so it is
  // available when the action's conditions are evaluated.
  {
    type: "condition",
    alias: u,
    name: "Page Evaluator Has Active Config Condition",
    api: f
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
        alias: u
      }
    ]
  },
  {
    type: "modal",
    alias: "ProWorks.AI.PageEvaluator.Modal.Evaluation",
    name: "Page Evaluator Evaluation Modal",
    element: () => import("./evaluation-modal.element-Dca71XlP.js").then((t) => ({
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
      menus: [d]
    }
  },
  {
    type: "workspace",
    alias: "ProWorks.AI.PageEvaluator.Workspace",
    name: "Page Evaluator Workspace",
    meta: {
      entityType: "evaluator-config"
    },
    element: () => import("./evaluator-config-workspace.element-CjmSjXro.js").then((t) => ({
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
    api: () => import("./page-evaluator-test-entity.repository-CvNBvq8R.js")
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
    element: () => import("./evaluator-form.element-ZzHGLN77.js").then((t) => ({
      element: t.EvaluatorFormElement
    }))
  }
], _ = (t) => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", c.length, "extensions"), p.registerMany(c);
}, j = (t, a) => {
  for (const e of c)
    p.unregister(e.alias);
};
export {
  E as A,
  i as B,
  k as a,
  w as b,
  C as c,
  $ as d,
  L as e,
  R as f,
  b as g,
  n as h,
  z as i,
  j,
  _ as o,
  U as r,
  W as u
};
//# sourceMappingURL=entry-point-COquEai-.js.map
