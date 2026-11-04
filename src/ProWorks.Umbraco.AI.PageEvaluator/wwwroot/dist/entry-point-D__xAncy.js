import { UmbConditionBase as v, umbExtensionsRegistry as f } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as h } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as P } from "@umbraco-cms/backoffice/http-client";
const r = P, n = "/umbraco/management/api/v1/page-evaluator", i = [{ scheme: "bearer", type: "http" }], g = "NetworkError";
class c extends Error {
  constructor(a, t, o = null, u = null) {
    super(`API ${a}: ${t}`), this.status = a, this.detail = t, this.category = o, this.type = u;
  }
}
const A = "Network request failed";
function p(e, a) {
  if (e === null || typeof e != "object" || !(a in e)) return null;
  const t = e[a];
  return typeof t == "string" ? t : null;
}
function w(e) {
  return e instanceof Error && e.message.length > 0 ? e.message : A;
}
function y(e) {
  const a = e.error;
  if (a instanceof Error)
    return new c(e.response.status, a.message, null, null);
  const o = p(a, "title") ?? (typeof a == "string" && a.length > 0 ? a : a ? JSON.stringify(a) : `HTTP ${e.response.status}`);
  return new c(e.response.status, o, p(a, "category"), p(a, "type"));
}
function l(e) {
  if (!e.response.ok || e.error !== void 0) throw y(e);
  return e.data;
}
async function s(e) {
  let a;
  try {
    a = await e();
  } catch (o) {
    throw o instanceof TypeError ? new c(0, o.message, null, g) : o;
  }
  const { response: t } = a;
  if (t === void 0)
    throw new c(0, w(a.error), null, g);
  return { data: a.data, error: a.error, response: t };
}
async function z() {
  const e = await s(
    () => r.get({ security: i, throwOnError: !1, url: `${n}/configurations` })
  );
  return l(e);
}
async function _(e) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(e)}`
    })
  );
  return l(a);
}
async function I(e) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/active/${encodeURIComponent(e)}`
    })
  );
  return a.response.status === 404 ? null : l(a);
}
async function $(e) {
  const a = await s(
    () => r.post({ security: i, throwOnError: !1, url: `${n}/configurations`, body: e })
  );
  return l(a);
}
async function L(e, a) {
  const t = await s(
    () => r.put({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(e)}`,
      body: a
    })
  );
  return l(t);
}
async function U(e) {
  const a = await s(
    () => r.post({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(e)}/activate`
    })
  );
  return l(a);
}
async function N(e) {
  const a = await s(
    () => r.delete({
      security: i,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(e)}`
    })
  );
  if (!a.response.ok || a.error !== void 0) throw y(a);
}
async function S(e, a = null) {
  const t = a !== null ? `?culture=${encodeURIComponent(a)}` : "", o = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/evaluate/cached/${encodeURIComponent(e)}${t}`
    })
  );
  return o.response.status === 404 ? null : l(o);
}
async function j(e) {
  const a = await s(
    () => r.post({ security: i, throwOnError: !1, url: `${n}/evaluate`, body: e })
  );
  return l(a);
}
async function F(e) {
  const a = await s(
    () => r.post({ security: i, throwOnError: !1, url: `${n}/recommend`, body: e })
  );
  return l(a);
}
async function D(e) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/profiles/${encodeURIComponent(e)}/sampling-support`
    })
  );
  return l(a);
}
async function M(e) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/profiles/${encodeURIComponent(e)}/system-prompt`
    })
  );
  return l(a);
}
async function x(e) {
  const a = await s(
    () => r.get({
      security: i,
      throwOnError: !1,
      url: `${n}/document-type/${encodeURIComponent(e)}/properties`
    })
  ), t = l(a);
  return {
    name: t.name,
    properties: t.properties.map((o) => ({
      alias: o.alias,
      label: o.label,
      groupName: o.groupName,
      editorAlias: o.editorAlias
    }))
  };
}
const d = "ProWorks.AI.PageEvaluator.Condition.HasActiveConfig";
class k extends v {
  constructor(a, t) {
    super(a, t), this.permitted = !1, this.consumeContext(h, (o) => {
      if (!o) {
        this.permitted = !1;
        return;
      }
      const u = o.structure.getOwnerContentType()?.alias ?? "";
      if (!u) {
        this.permitted = !1;
        return;
      }
      I(u).then((E) => {
        this.permitted = E !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const C = "Uai.Menu.Addons", W = [
  {
    type: "uaiAgentFrontendTool",
    alias: "ProWorks.AI.PageEvaluator.Tool.EvaluateCurrentPage",
    name: "Page Evaluator Evaluate Current Page Tool",
    api: () => import("./evaluate-current-page.tool.api-CYI6eMaJ.js"),
    meta: {
      toolName: "evaluate_current_page",
      description: "Evaluates the page open in the editor against the site's Page Evaluator checks, using the values on screen (unsaved changes included) for the language being viewed. Returns the score, each check's status and explanation, and which fields can be improved. Returns the cached result when one exists unless fresh is true; if the result is marked outOfDate, tell the user and offer a fresh evaluation.",
      parameters: {
        type: "object",
        properties: {
          fresh: { type: "boolean", description: "Run a new evaluation instead of returning the cached result." }
        },
        additionalProperties: !1
      },
      scope: "page-evaluator-read",
      isDestructive: !1
    }
  },
  {
    type: "uaiAgentFrontendTool",
    alias: "ProWorks.AI.PageEvaluator.Tool.RecommendPageValues",
    name: "Page Evaluator Recommend Page Values Tool",
    api: () => import("./recommend-page-values.tool.api-BazN2Ywa.js"),
    meta: {
      toolName: "recommend_page_values",
      description: "Gets AI-recommended values for fields named by failed or warning checks in the current Page Evaluator report for the open page. Only fields listed in the report's 'recommendable' list are allowed. Returns a reference for each recommendation; show the value to the user, and pass the reference to apply_page_recommendation only if they accept it.",
      parameters: {
        type: "object",
        required: ["propertyAliases"],
        properties: {
          propertyAliases: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
            description: "Aliases from the report's recommendable list."
          }
        },
        additionalProperties: !1
      },
      scope: "page-evaluator-read",
      isDestructive: !1
    }
  },
  {
    type: "uaiAgentFrontendTool",
    alias: "ProWorks.AI.PageEvaluator.Tool.ApplyPageRecommendation",
    name: "Page Evaluator Apply Page Recommendation Tool",
    api: () => import("./apply-page-recommendation.tool.api-B9LGJ50g.js"),
    meta: {
      toolName: "apply_page_recommendation",
      description: "Writes one accepted Page Evaluator recommendation into its field on the open page, exactly as recommended. The change is staged in the editor and NOT saved; the user must click Save. Only call this after the user has seen the value and agreed. Requires a reference from recommend_page_values.",
      parameters: {
        type: "object",
        required: ["reference"],
        properties: {
          reference: { type: "string", description: "The reference returned by recommend_page_values." }
        },
        additionalProperties: !1
      },
      scope: "page-evaluator-write",
      // Permission metadata only; the approval prompt comes from `approval` (research R5).
      isDestructive: !0,
      approval: {
        config: {
          title: "#pageEvaluatorCopilot_applyApprovalTitle",
          message: "#pageEvaluatorCopilot_applyApprovalMessage"
        }
      }
    }
  }
], R = W, m = [
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
    js: () => import("./en-B7COnvyZ.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Es",
    name: "Page Evaluator Spanish Localization",
    meta: {
      culture: "es"
    },
    js: () => import("./es-Cyp20lRr.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Fr",
    name: "Page Evaluator French Localization",
    meta: {
      culture: "fr"
    },
    js: () => import("./fr-6C5gLjSq.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Da",
    name: "Page Evaluator Danish Localization",
    meta: {
      culture: "da"
    },
    js: () => import("./da-CdCedAzn.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.De",
    name: "Page Evaluator German Localization",
    meta: {
      culture: "de"
    },
    js: () => import("./de-DYdOcGm_.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Nb",
    name: "Page Evaluator Norwegian Localization",
    meta: {
      culture: "nb"
    },
    js: () => import("./nb-Cv4uMVvq.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Sv",
    name: "Page Evaluator Swedish Localization",
    meta: {
      culture: "sv"
    },
    js: () => import("./sv-CCef3UhE.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.It",
    name: "Page Evaluator Italian Localization",
    meta: {
      culture: "it"
    },
    js: () => import("./it-BYxRv3OP.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Hi",
    name: "Page Evaluator Hindi Localization",
    meta: {
      culture: "hi"
    },
    js: () => import("./hi-5ii8GyjV.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Pt",
    name: "Page Evaluator Portuguese Localization",
    meta: {
      culture: "pt"
    },
    js: () => import("./pt-IixwNfOd.js")
  },
  // ---------------------------------------------------------------------------
  // US1 — Content Editor Evaluates a Page
  // ---------------------------------------------------------------------------
  // Condition: resolves true only when an active evaluator config exists for
  // the current document type. Registered before the workspaceAction so it is
  // available when the action's conditions are evaluated.
  {
    type: "condition",
    alias: d,
    name: "Page Evaluator Has Active Config Condition",
    api: k
  },
  {
    type: "workspaceAction",
    kind: "default",
    alias: "ProWorks.AI.PageEvaluator.WorkspaceAction",
    name: "Page Evaluator Workspace Action",
    api: () => import("./page-evaluator-action.api-DGg3OyuV.js"),
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
        alias: d
      }
    ]
  },
  {
    type: "modal",
    alias: "ProWorks.AI.PageEvaluator.Modal.Evaluation",
    name: "Page Evaluator Evaluation Modal",
    element: () => import("./evaluation-modal.element-LrZW57pO.js").then((e) => ({
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
    element: () => import("./evaluator-config-workspace.element-DEdPyJHX.js").then((e) => ({
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
    api: () => import("./page-evaluator-test-entity.repository-x7cS-R0g.js")
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
    element: () => import("./evaluator-form.element-BgfGUgzO.js").then((e) => ({
      element: e.EvaluatorFormElement
    }))
  },
  // ---------------------------------------------------------------------------
  // 006 US1 — Copilot frontend tools
  // ---------------------------------------------------------------------------
  ...R
], B = () => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", m.length, "extensions"), f.registerMany(m);
}, H = () => {
  for (const e of m)
    f.unregister(e.alias);
};
export {
  c as A,
  i as B,
  g as N,
  S as a,
  z as b,
  U as c,
  N as d,
  j as e,
  _ as f,
  I as g,
  x as h,
  r as i,
  M as j,
  D as k,
  $ as l,
  R as m,
  H as n,
  B as o,
  F as r,
  L as u
};
//# sourceMappingURL=entry-point-D__xAncy.js.map
