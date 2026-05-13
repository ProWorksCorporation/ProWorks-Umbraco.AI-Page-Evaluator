import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type { UaiTestFeatureEntityRepositoryApi, UaiTestFeatureEntityData } from '@umbraco-ai/core';
import { getConfigurations, getConfiguration } from '../shared/api-client.js';

export class PageEvaluatorTestFeatureEntityRepository
  extends UmbControllerBase
  implements UaiTestFeatureEntityRepositoryApi
{
  constructor(host: UmbControllerHost) {
    super(host);
  }

  async getEntities(): Promise<UaiTestFeatureEntityData[]> {
    try {
      const response = await getConfigurations();
      return response.items.map((config) => ({
        id: config.id,
        name: config.name,
        description: config.documentTypeName ?? config.documentTypeAlias,
        icon: 'icon-settings',
      }));
    } catch (error) {
      console.error('[PageEvaluator] Failed to load evaluator configs for test picker:', error);
      return [];
    }
  }

  async getEntity(id: string): Promise<UaiTestFeatureEntityData | undefined> {
    try {
      const config = await getConfiguration(id);
      return {
        id: config.id,
        name: config.name,
        description: config.documentTypeName ?? config.documentTypeAlias,
        icon: 'icon-settings',
      };
    } catch {
      return undefined;
    }
  }
}

export { PageEvaluatorTestFeatureEntityRepository as api };
