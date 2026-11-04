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
import type { UmbEntryPointOnInit, UmbEntryPointOnUnload } from '@umbraco-cms/backoffice/extension-api';
// Type-only import: pulls `ManifestLocalization` into the global `UmbExtensionManifestMap`
// union (declaration merging only applies to files TypeScript actually includes in the
// program — this package doesn't import runtime code from `@umbraco-cms/backoffice/localization`,
// so without this the compiler falls back to checking our 'localization' manifest literal
// against the generic `ManifestBase` and rejects the `meta` property).
import type {} from '@umbraco-cms/backoffice/localization';
import {
  PageEvaluatorActiveConfigCondition,
  PROWORKS_AI_ACTIVE_CONFIG_CONDITION_ALIAS,
} from './workspace-action/page-evaluator-active-config.condition.js';
import type { PageEvaluatorFrontendToolManifest } from './copilot/types.js';

/** Alias for the Umbraco.AI Addons menu. */
const UAI_ADDONS_MENU_ALIAS = 'Uai.Menu.Addons';

/**
 * Copilot frontend tools (006 US1, contracts/copilot-tools.md, research R5). Registered unconditionally: on a site
 * without Umbraco.AI Agent.UI the registry keeps the unknown `uaiAgentFrontendTool` type and nothing ever loads the
 * lazy `api` chunks. Admins see the tools only after granting the `page-evaluator-read`/`-write` scopes to an agent.
 * Labels come from the `uaiTool_*` localization keys; `description` is the English instruction for the model.
 */
const copilotTools: PageEvaluatorFrontendToolManifest[] = [
  {
    type: 'uaiAgentFrontendTool',
    alias: 'ProWorks.AI.PageEvaluator.Tool.EvaluateCurrentPage',
    name: 'Page Evaluator Evaluate Current Page Tool',
    api: () => import('./copilot/evaluate-current-page.tool.api.js'),
    meta: {
      toolName: 'evaluate_current_page',
      description:
        "Evaluates the page open in the editor against the site's Page Evaluator checks, using the values on screen (unsaved changes included) for the language being viewed. Returns the score, each check's status and explanation, and which fields can be improved. Returns the cached result when one exists unless fresh is true; if the result is marked outOfDate, tell the user and offer a fresh evaluation.",
      parameters: {
        type: 'object',
        properties: {
          fresh: { type: 'boolean', description: 'Run a new evaluation instead of returning the cached result.' },
        },
        additionalProperties: false,
      },
      scope: 'page-evaluator-read',
      isDestructive: false,
    },
  },
  {
    type: 'uaiAgentFrontendTool',
    alias: 'ProWorks.AI.PageEvaluator.Tool.RecommendPageValues',
    name: 'Page Evaluator Recommend Page Values Tool',
    api: () => import('./copilot/recommend-page-values.tool.api.js'),
    meta: {
      toolName: 'recommend_page_values',
      description:
        "Gets AI-recommended values for fields named by failed or warning checks in the current Page Evaluator report for the open page. Only fields listed in the report's 'recommendable' list are allowed. Returns a reference for each recommendation; show the value to the user, and pass the reference to apply_page_recommendation only if they accept it.",
      parameters: {
        type: 'object',
        required: ['propertyAliases'],
        properties: {
          propertyAliases: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' },
            description: "Aliases from the report's recommendable list.",
          },
        },
        additionalProperties: false,
      },
      scope: 'page-evaluator-read',
      isDestructive: false,
    },
  },
  {
    type: 'uaiAgentFrontendTool',
    alias: 'ProWorks.AI.PageEvaluator.Tool.ApplyPageRecommendation',
    name: 'Page Evaluator Apply Page Recommendation Tool',
    api: () => import('./copilot/apply-page-recommendation.tool.api.js'),
    meta: {
      toolName: 'apply_page_recommendation',
      description:
        'Writes one accepted Page Evaluator recommendation into its field on the open page, exactly as recommended. The change is staged in the editor and NOT saved; the user must click Save. Only call this after the user has seen the value and agreed. Requires a reference from recommend_page_values.',
      parameters: {
        type: 'object',
        required: ['reference'],
        properties: {
          reference: { type: 'string', description: 'The reference returned by recommend_page_values.' },
        },
        additionalProperties: false,
      },
      scope: 'page-evaluator-write',
      // Permission metadata only; the approval prompt comes from `approval` (research R5).
      isDestructive: true,
      approval: {
        config: {
          title: '#pageEvaluatorCopilot_applyApprovalTitle',
          message: '#pageEvaluatorCopilot_applyApprovalMessage',
        },
      },
    },
  },
];

/**
 * The Copilot tool manifests as registry entries. `uaiAgentFrontendTool` is declared by `@umbraco-ai/agent-ui`, which
 * this package must not depend on (spec FR-012), so the global `UmbExtensionManifest` union doesn't know the type.
 * This is the single cast allowed by the plan's Complexity Tracking; the manifests themselves are fully typed above.
 */
export const copilotToolManifests = copilotTools as unknown as UmbExtensionManifest[];

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
  // Localization: English default translations for all package UI strings.
  // ---------------------------------------------------------------------------
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.En',
    name: 'Page Evaluator English Localization',
    meta: {
      culture: 'en',
    },
    js: () => import('./localization/en.js'),
  },
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.Es',
    name: 'Page Evaluator Spanish Localization',
    meta: {
      culture: 'es',
    },
    js: () => import('./localization/es.js'),
  },
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.Fr',
    name: 'Page Evaluator French Localization',
    meta: {
      culture: 'fr',
    },
    js: () => import('./localization/fr.js'),
  },
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.Da',
    name: 'Page Evaluator Danish Localization',
    meta: {
      culture: 'da',
    },
    js: () => import('./localization/da.js'),
  },
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.De',
    name: 'Page Evaluator German Localization',
    meta: {
      culture: 'de',
    },
    js: () => import('./localization/de.js'),
  },
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.Nb',
    name: 'Page Evaluator Norwegian Localization',
    meta: {
      culture: 'nb',
    },
    js: () => import('./localization/nb.js'),
  },
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.Sv',
    name: 'Page Evaluator Swedish Localization',
    meta: {
      culture: 'sv',
    },
    js: () => import('./localization/sv.js'),
  },
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.It',
    name: 'Page Evaluator Italian Localization',
    meta: {
      culture: 'it',
    },
    js: () => import('./localization/it.js'),
  },
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.Hi',
    name: 'Page Evaluator Hindi Localization',
    meta: {
      culture: 'hi',
    },
    js: () => import('./localization/hi.js'),
  },
  {
    type: 'localization',
    alias: 'ProWorks.AI.PageEvaluator.Localization.Pt',
    name: 'Page Evaluator Portuguese Localization',
    meta: {
      culture: 'pt',
    },
    js: () => import('./localization/pt.js'),
  },

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
  } as UmbExtensionManifest,

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

  // ---------------------------------------------------------------------------
  // Umbraco.AI Tests integration — entity picker repository for the test runner
  // ---------------------------------------------------------------------------

  // Provides the list of AIEvaluatorConfig entities for the "Target" picker
  // when creating a test with the "Page Evaluator Test" feature.
  // Discovery: the test runner searches for repositories with
  //   alias starting "Uai.Repository.TestFeatureEntity." AND meta.feature matching our feature ID.
  {
    type: 'repository',
    alias: 'Uai.Repository.TestFeatureEntity.ProworksPageEvaluator',
    name: 'Page Evaluator Test Feature Entity Repository',
    meta: {
      feature: 'proworks-page-evaluator',
    },
    api: () => import('./test/page-evaluator-test-entity.repository.js'),
  } as UmbExtensionManifest,

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

  // ---------------------------------------------------------------------------
  // 006 US1 — Copilot frontend tools
  // ---------------------------------------------------------------------------
  ...copilotToolManifests,
];

export const onInit: UmbEntryPointOnInit = (): void => {
  console.log('[ProWorks.AI.PageEvaluator] onInit called — registering', manifests.length, 'extensions');
  umbExtensionsRegistry.registerMany(manifests);
  // umbHttpClient (used by apiClient) is pre-configured with Bearer auth by Umbraco's
  // app.element before any extension onInit runs — no further setup needed here.
};

export const onUnload: UmbEntryPointOnUnload = (): void => {
  for (const manifest of manifests) {
    umbExtensionsRegistry.unregister(manifest.alias);
  }
};
