import { umbExtensionsRegistry as o } from "@umbraco-cms/backoffice/extension-registry";
const t = "Uai.Menu.Addons", e = [
  // ---------------------------------------------------------------------------
  // US1 — Content Editor Evaluates a Page
  // ---------------------------------------------------------------------------
  {
    type: "workspaceAction",
    kind: "default",
    alias: "ProWorks.AI.PageEvaluator.WorkspaceAction",
    name: "Page Evaluator Workspace Action",
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Umb.Workspace.Document"
      }
    ],
    api: () => import("./page-evaluator-action.api-BK6SUETe.js"),
    meta: {
      label: "Evaluate Page",
      look: "secondary"
    }
  },
  {
    type: "modal",
    alias: "ProWorks.AI.PageEvaluator.Modal.Evaluation",
    name: "Page Evaluator Evaluation Modal",
    element: () => import("./evaluation-modal.element-BsV1ExVk.js").then((a) => ({
      element: a.EvaluationModalElement
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
      menus: [t]
    }
  },
  {
    type: "workspace",
    alias: "ProWorks.AI.PageEvaluator.Workspace",
    name: "Page Evaluator Workspace",
    meta: {
      entityType: "evaluator-config"
    },
    element: () => import("./evaluator-config-workspace.element-BkdTK0ec.js").then((a) => ({
      element: a.EvaluatorConfigWorkspaceElement
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
    element: () => import("./evaluator-form.element-BbKnzl6p.js").then((a) => ({
      element: a.EvaluatorFormElement
    }))
  }
], r = (a) => {
  console.log("[ProWorks.AI.PageEvaluator] onInit called — registering", e.length, "extensions"), o.registerMany(e);
}, i = () => {
  for (const a of e)
    o.unregister(a.alias);
};
export {
  r as onInit,
  i as onUnload
};
//# sourceMappingURL=entry-point.js.map
