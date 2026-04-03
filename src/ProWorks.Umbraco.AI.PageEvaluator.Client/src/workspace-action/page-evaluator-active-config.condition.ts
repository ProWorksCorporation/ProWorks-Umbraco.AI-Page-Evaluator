import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import type { UmbConditionControllerArguments, UmbConditionConfigBase } from '@umbraco-cms/backoffice/extension-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { getActiveConfiguration } from '../shared/api-client.js';

/**
 * Alias used both in the condition manifest and in the workspaceAction conditions array.
 * Keep as a const so there is a single source of truth.
 */
export const PROWORKS_AI_ACTIVE_CONFIG_CONDITION_ALIAS = 'ProWorks.AI.PageEvaluator.Condition.HasActiveConfig';

/**
 * Custom condition that resolves the current document type alias from
 * UMB_DOCUMENT_WORKSPACE_CONTEXT, then calls getActiveConfiguration(alias).
 *
 * Sets permitted = true only when an active evaluator config exists for the
 * current document type. When permitted = false, Umbraco removes the
 * workspaceAction slot entirely — the button is fully hidden (not disabled).
 *
 * Lifecycle: UmbConditionBase extends UmbControllerBase, so consumeContext
 * wiring is torn down automatically when the host is destroyed.
 */
export class PageEvaluatorActiveConfigCondition extends UmbConditionBase<UmbConditionConfigBase> {
  constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<UmbConditionConfigBase>) {
    super(host, args);

    // Start as not permitted — stay hidden until the async check resolves.
    this.permitted = false;

    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (workspaceCtx) => {
      if (!workspaceCtx) {
        this.permitted = false;
        return;
      }

      // structure.getOwnerContentType() is synchronously available once the
      // workspace context is provided (the workspace loads the content type
      // before any workspace actions are rendered).
      const alias = workspaceCtx.structure.getOwnerContentType()?.alias ?? '';

      if (!alias) {
        this.permitted = false;
        return;
      }

      void getActiveConfiguration(alias)
        .then((config) => {
          this.permitted = config !== null;
        })
        .catch(() => {
          this.permitted = false;
        });
    });
  }
}
