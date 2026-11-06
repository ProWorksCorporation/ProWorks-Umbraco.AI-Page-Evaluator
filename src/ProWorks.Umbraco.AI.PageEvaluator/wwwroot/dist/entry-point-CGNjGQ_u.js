import { UmbConditionBase as y, umbExtensionsRegistry as h } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as E } from "@umbraco-cms/backoffice/document";
import { umbHttpClient as P } from "@umbraco-cms/backoffice/http-client";
const r = P, n = "/umbraco/management/api/v1/page-evaluator", s = [{ scheme: "bearer", type: "http" }], g = "NetworkError";
class u extends Error {
  constructor(a, t, o = null, c = null) {
    super(`API ${a}: ${t}`), this.status = a, this.detail = t, this.category = o, this.type = c;
  }
}
const w = "Network request failed";
function p(e, a) {
  if (e === null || typeof e != "object" || !(a in e)) return null;
  const t = e[a];
  return typeof t == "string" ? t : null;
}
function A(e) {
  return e instanceof Error && e.message.length > 0 ? e.message : w;
}
function f(e) {
  const a = e.error;
  if (a instanceof Error)
    return new u(e.response.status, a.message, null, null);
  const o = p(a, "title") ?? (typeof a == "string" && a.length > 0 ? a : a ? JSON.stringify(a) : `HTTP ${e.response.status}`);
  return new u(e.response.status, o, p(a, "category"), p(a, "type"));
}
function l(e) {
  if (!e.response.ok || e.error !== void 0) throw f(e);
  return e.data;
}
async function i(e) {
  let a;
  try {
    a = await e();
  } catch (o) {
    throw o instanceof TypeError ? new u(0, o.message, null, g) : o;
  }
  const { response: t } = a;
  if (t === void 0)
    throw new u(0, A(a.error), null, g);
  return { data: a.data, error: a.error, response: t };
}
async function $() {
  const e = await i(
    () => r.get({ security: s, throwOnError: !1, url: `${n}/configurations` })
  );
  return l(e);
}
async function L(e) {
  const a = await i(
    () => r.get({
      security: s,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(e)}`
    })
  );
  return l(a);
}
async function k(e) {
  const a = await i(
    () => r.get({
      security: s,
      throwOnError: !1,
      url: `${n}/configurations/active/${encodeURIComponent(e)}`
    })
  );
  return a.response.status === 404 ? null : l(a);
}
async function N(e) {
  const a = await i(
    () => r.post({ security: s, throwOnError: !1, url: `${n}/configurations`, body: e })
  );
  return l(a);
}
async function U(e, a) {
  const t = await i(
    () => r.put({
      security: s,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(e)}`,
      body: a
    })
  );
  return l(t);
}
async function x(e) {
  const a = await i(
    () => r.post({
      security: s,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(e)}/activate`
    })
  );
  return l(a);
}
async function S(e) {
  const a = await i(
    () => r.delete({
      security: s,
      throwOnError: !1,
      url: `${n}/configurations/${encodeURIComponent(e)}`
    })
  );
  if (!a.response.ok || a.error !== void 0) throw f(a);
}
async function j(e, a = null) {
  const t = a !== null ? `?culture=${encodeURIComponent(a)}` : "", o = await i(
    () => r.get({
      security: s,
      throwOnError: !1,
      url: `${n}/evaluate/cached/${encodeURIComponent(e)}${t}`
    })
  );
  return o.response.status === 404 ? null : l(o);
}
async function F(e) {
  const a = await i(
    () => r.post({ security: s, throwOnError: !1, url: `${n}/evaluate`, body: e })
  );
  return l(a);
}
async function D(e) {
  const a = await i(
    () => r.post({ security: s, throwOnError: !1, url: `${n}/recommend`, body: e })
  );
  return l(a);
}
async function M(e) {
  const a = await i(
    () => r.get({
      security: s,
      throwOnError: !1,
      url: `${n}/profiles/${encodeURIComponent(e)}/sampling-support`
    })
  );
  return l(a);
}
async function V(e) {
  const a = await i(
    () => r.get({
      security: s,
      throwOnError: !1,
      url: `${n}/profiles/${encodeURIComponent(e)}/system-prompt`
    })
  );
  return l(a);
}
async function B(e) {
  const a = await i(
    () => r.get({
      security: s,
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
class I extends y {
  constructor(a, t) {
    super(a, t), this.permitted = !1, this.consumeContext(E, (o) => {
      if (!o) {
        this.permitted = !1;
        return;
      }
      const c = o.structure.getOwnerContentType()?.alias ?? "";
      if (!c) {
        this.permitted = !1;
        return;
      }
      k(c).then((v) => {
        this.permitted = v !== null;
      }).catch(() => {
        this.permitted = !1;
      });
    });
  }
}
const R = "Uai.Menu.Addons", C = [
  {
    type: "uaiAgentFrontendTool",
    alias: "ProWorks.AI.PageEvaluator.Tool.EvaluateCurrentPage",
    name: "Page Evaluator Evaluate Current Page Tool",
    api: () => import("./evaluate-current-page.tool.api-BOmO5pny.js"),
    meta: {
      toolName: "evaluate_current_page",
      description: "Evaluates the page open in the editor against the site's Page Evaluator checks, using the values on screen (unsaved changes included) for the language being viewed. Returns the score (overall and per dimension, on a 1–5 scale where 5 is best), each check's status and explanation, and which fields can be improved. Returns the cached result when one exists (no new AI call) unless fresh is true; do not set fresh unless the user asks for a new evaluation; if the result is marked outOfDate, tell the user and offer a fresh evaluation. To fix failing checks, always use recommend_page_values and then apply_page_recommendation; never write those fields with other editing tools (such as set_value), and never save or publish the page for this.",
      parameters: {
        type: "object",
        properties: {
          fresh: {
            type: "boolean",
            description: 'Only set this to true when the user explicitly asks for a new evaluation (for example "run it again", "rescore" or "evaluate it fresh"). Otherwise leave it out: the tool returns the cached result and marks it outOfDate when the page has changed, so you can tell the user and offer a fresh run.'
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
    alias: "ProWorks.AI.PageEvaluator.Tool.RecommendPageValues",
    name: "Page Evaluator Recommend Page Values Tool",
    api: () => import("./recommend-page-values.tool.api-LviiHtzW.js"),
    meta: {
      toolName: "recommend_page_values",
      description: "Gets AI-recommended values for fields named by failed or warning checks in the current Page Evaluator report for the open page. Only fields listed in the report's 'recommendable' list are allowed. Use this whenever the user asks to fix or improve the failing checks, instead of editing the fields with other tools (such as set_value). Fixing is two steps: call this now, show each value to the user exactly as written and ask which to apply; then, after the user replies, call apply_page_recommendation. Never save or publish the page for this. Returns a reference for each recommendation.",
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
    api: () => import("./apply-page-recommendation.tool.api-S8K___cR.js"),
    meta: {
      toolName: "apply_page_recommendation",
      description: 'Writes one accepted Page Evaluator recommendation into its field on the open page, exactly as recommended. The change is staged in the editor and NOT saved; the user must click Save. Only call this after you have shown the user the exact value in this conversation and they agreed to it in a later message; never in the same turn as recommend_page_values. Requires a reference from recommend_page_values. Applies one value per call: when the user accepts several (for example "apply both"), call this tool once for each accepted reference, one after another, without asking for new recommendations in between.',
      parameters: {
        type: "object",
        required: ["reference"],
        properties: {
          reference: {
            type: "string",
            description: "The reference returned by recommend_page_values."
          }
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
], _ = [
  {
    type: "uaiAgentToolRenderer",
    alias: "ProWorks.AI.PageEvaluator.ToolRenderer.RecommendPageValues",
    name: "Page Evaluator Recommend Page Values Tool Renderer",
    element: () => import("./recommendations-renderer.element-B8RDcfKL.js"),
    meta: {
      toolName: "recommend_page_values",
      label: "Recommend page values",
      icon: "icon-lightbulb"
    }
  },
  {
    type: "uaiAgentToolRenderer",
    alias: "ProWorks.AI.PageEvaluator.ToolRenderer.ApplyPageRecommendation",
    name: "Page Evaluator Apply Page Recommendation Tool Renderer",
    element: () => import("./apply-renderer.element-BmUdJG2G.js"),
    meta: {
      toolName: "apply_page_recommendation",
      label: "Apply page recommendation",
      icon: "icon-edit"
    }
  }
], T = C, b = _, m = [
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
    js: () => import("./en-BwGBuMg0.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Es",
    name: "Page Evaluator Spanish Localization",
    meta: {
      culture: "es"
    },
    js: () => import("./es-CcZVNT_f.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Fr",
    name: "Page Evaluator French Localization",
    meta: {
      culture: "fr"
    },
    js: () => import("./fr-Dfe0416e.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Da",
    name: "Page Evaluator Danish Localization",
    meta: {
      culture: "da"
    },
    js: () => import("./da-CVBL-U1v.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.De",
    name: "Page Evaluator German Localization",
    meta: {
      culture: "de"
    },
    js: () => import("./de-DmW0TsjJ.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Nb",
    name: "Page Evaluator Norwegian Localization",
    meta: {
      culture: "nb"
    },
    js: () => import("./nb-DJugJ6CT.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Sv",
    name: "Page Evaluator Swedish Localization",
    meta: {
      culture: "sv"
    },
    js: () => import("./sv-CQlyCmpL.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.It",
    name: "Page Evaluator Italian Localization",
    meta: {
      culture: "it"
    },
    js: () => import("./it-BBYz7_iE.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Hi",
    name: "Page Evaluator Hindi Localization",
    meta: {
      culture: "hi"
    },
    js: () => import("./hi-BvS-U4Lj.js")
  },
  {
    type: "localization",
    alias: "ProWorks.AI.PageEvaluator.Localization.Pt",
    name: "Page Evaluator Portuguese Localization",
    meta: {
      culture: "pt"
    },
    js: () => import("./pt-DNkQhg_U.js")
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
    api: I
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
    element: () => import("./evaluation-modal.element-DPAGkpTx.js").then((e) => ({
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
      menus: [R]
    }
  },
  {
    type: "workspace",
    alias: "ProWorks.AI.PageEvaluator.Workspace",
    name: "Page Evaluator Workspace",
    meta: {
      entityType: "evaluator-config"
    },
    element: () => import("./evaluator-config-workspace.element-C87yB9aq.js").then(
      (e) => ({
        element: e.EvaluatorConfigWorkspaceElement
      })
    )
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
    api: () => import("./page-evaluator-test-entity.repository-CBsFqVxZ.js")
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
    element: () => import("./evaluator-form.element-D3MnxoCI.js").then((e) => ({
      element: e.EvaluatorFormElement
    }))
  },
  // ---------------------------------------------------------------------------
  // 006 US1 — Copilot frontend tools and their chat renderers
  // ---------------------------------------------------------------------------
  ...T,
  ...b
], H = () => {
  console.log(
    "[ProWorks.AI.PageEvaluator] onInit called — registering",
    m.length,
    "extensions"
  ), h.registerMany(m);
}, q = () => {
  for (const e of m)
    h.unregister(e.alias);
};
export {
  u as A,
  s as B,
  g as N,
  j as a,
  $ as b,
  x as c,
  S as d,
  F as e,
  L as f,
  k as g,
  B as h,
  r as i,
  V as j,
  M as k,
  N as l,
  T as m,
  b as n,
  H as o,
  q as p,
  D as r,
  U as u
};
//# sourceMappingURL=entry-point-CGNjGQ_u.js.map
