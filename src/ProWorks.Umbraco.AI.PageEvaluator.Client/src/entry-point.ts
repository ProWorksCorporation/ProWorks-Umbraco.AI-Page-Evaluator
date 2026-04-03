/**
 * Back-office entry point for the ProWorks AI Page Evaluator package.
 * Registered as a `backofficeEntryPoint` extension in umbraco-package.json.
 *
 * This module is the single Vite build entry (build.lib.entry in vite.config.ts).
 * All extension manifests are registered here programmatically so the
 * umbraco-package.json only needs to declare this one entry point.
 *
 * Constitution Principle IV: manifest-driven, no global state mutations.
 */

import { umbExtensionsRegistry } from '@umbraco-cms/backoffice/extension-registry';
import type { UmbEntryPointOnInit } from '@umbraco-cms/backoffice/extension-api';
import {
  PageEvaluatorActiveConfigCondition,
  PROWORKS_AI_ACTIVE_CONFIG_CONDITION_ALIAS,
} from './workspace-action/page-evaluator-active-config.condition.js';

/** Alias for the Umbraco.AI Addons menu. */
const UAI_ADDONS_MENU_ALIAS = 'Uai.Menu.Addons';

/**
 * All extension manifests for this package.
 *   - US1 (T039): workspaceAction + modal
 *   - US2 (T051): menuItem + workspace
 *
 * UmbExtensionManifest is a global type declared in @umbraco-cms/backoffice.
 * Element loaders must return { element: Constructor } to match ElementLoaderExports.
 */
const manifests: UmbExtensionManifest[] = [
  // ---------------------------------------------------------------------------
  // US1 — Content Editor Evaluates a Page
  // ---------------------------------------------------------------------------

  // Condition: resolves true only when an active evaluator config exists for
  // the current document type. Registered before the workspaceAction so it is
  // available when the action's conditions are evaluated.
  {
    type: 'condition',
    alias: PROWORKS_AI_ACTIVE_CONFIG_CONDITION_ALIAS,
    name: 'Page Evaluator Has Active Config Condition',
    api: PageEvaluatorActiveConfigCondition,
  },

  {
    type: 'workspaceAction',
    kind: 'default',
    alias: 'ProWorks.AI.PageEvaluator.WorkspaceAction',
    name: 'Page Evaluator Workspace Action',
    api: () => import('./workspace-action/page-evaluator-action.api.js'),
    meta: {
      label: 'Evaluate Page',
      look: 'secondary',
    },
    conditions: [
      {
        alias: 'Umb.Condition.WorkspaceAlias',
        match: 'Umb.Workspace.Document',
      },
      {
        alias: PROWORKS_AI_ACTIVE_CONFIG_CONDITION_ALIAS,
      },
    ],
  },

  {
    type: 'modal',
    alias: 'ProWorks.AI.PageEvaluator.Modal.Evaluation',
    name: 'Page Evaluator Evaluation Modal',
    element: () =>
      import('./evaluation-modal/evaluation-modal.element.js').then((m) => ({
        element: m.EvaluationModalElement,
      })),
  },

  // ---------------------------------------------------------------------------
  // US2 — Administrator Configures Evaluator per Document Type
  // ---------------------------------------------------------------------------

  {
    type: 'menuItem',
    alias: 'ProWorks.AI.PageEvaluator.MenuItem',
    name: 'Page Evaluator Menu Item',
    meta: {
      label: 'Page Evaluator',
      icon: 'icon-settings',
      entityType: 'evaluator-config',
      menus: [UAI_ADDONS_MENU_ALIAS],
    },
  },

  {
    type: 'workspace',
    alias: 'ProWorks.AI.PageEvaluator.Workspace',
    name: 'Page Evaluator Workspace',
    meta: {
      entityType: 'evaluator-config',
    },
    element: () =>
      import('./evaluator-config/evaluator-config-workspace.element.js').then((m) => ({
        element: m.EvaluatorConfigWorkspaceElement,
      })),
  },

  {
    type: 'workspaceView',
    alias: 'ProWorks.AI.PageEvaluator.Workspace.Form',
    name: 'Page Evaluator Form View',
    meta: {
      label: 'Configuration',
      pathname: 'edit',
      icon: 'icon-settings',
    },
    conditions: [
      {
        alias: 'Umb.Condition.WorkspaceAlias',
        match: 'ProWorks.AI.PageEvaluator.Workspace',
      },
    ],
    element: () =>
      import('./evaluator-config/evaluator-form.element.js').then((m) => ({
        element: m.EvaluatorFormElement,
      })),
  },
];

export const onInit: UmbEntryPointOnInit = (_host): void => {
  console.log('[ProWorks.AI.PageEvaluator] onInit called — registering', manifests.length, 'extensions');
  umbExtensionsRegistry.registerMany(manifests);
  // umbHttpClient (used by apiClient) is pre-configured with Bearer auth by Umbraco's
  // app.element before any extension onInit runs — no further setup needed here.
};

export const onUnload = (): void => {
  for (const manifest of manifests) {
    umbExtensionsRegistry.unregister(manifest.alias);
  }
};
