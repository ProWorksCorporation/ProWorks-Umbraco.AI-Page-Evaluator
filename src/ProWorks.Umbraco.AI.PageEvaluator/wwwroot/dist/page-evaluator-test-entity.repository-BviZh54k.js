import { UmbControllerBase as o } from "@umbraco-cms/backoffice/class-api";
import { a as r, c as a } from "./entry-point-Cp2GUpa3.js";
class c extends o {
  constructor(t) {
    super(t);
  }
  async getEntities() {
    try {
      return (await r()).items.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.documentTypeName ?? e.documentTypeAlias,
        icon: "icon-settings"
      }));
    } catch (t) {
      return console.error("[PageEvaluator] Failed to load evaluator configs for test picker:", t), [];
    }
  }
  async getEntity(t) {
    try {
      const e = await a(t);
      return {
        id: e.id,
        name: e.name,
        description: e.documentTypeName ?? e.documentTypeAlias,
        icon: "icon-settings"
      };
    } catch {
      return;
    }
  }
}
export {
  c as PageEvaluatorTestFeatureEntityRepository,
  c as api
};
//# sourceMappingURL=page-evaluator-test-entity.repository-BviZh54k.js.map
