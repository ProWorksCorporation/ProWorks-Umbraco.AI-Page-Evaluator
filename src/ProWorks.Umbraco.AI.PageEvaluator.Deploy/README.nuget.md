# ProWorks Umbraco AI Page Evaluator — Deploy

Adds [Umbraco Deploy](https://umbraco.com/products/add-ons/deploy/) support for ProWorks AI Page Evaluator configurations. Create, edit and activate evaluator configurations in development, and Deploy moves them to staging and live together with the AI profiles and contexts they use, so nobody recreates them by hand. It works like Umbraco.AI's own Deploy support for prompts and agents.

## Requirements

| Dependency | Version |
|---|---|
| ProWorks.Umbraco.AI.PageEvaluator | the same version as this package (installed automatically) |
| Umbraco.AI.Deploy | **17.3.1** or later 17.x (installed automatically; it brings Umbraco Deploy) |
| Umbraco CMS | 17.8.0 or later 17.x |
| Umbraco.AI | 17.6.1 or later 17.x |

## Install

```bash
dotnet add package ProWorks.Umbraco.AI.PageEvaluator.Deploy
```

**Install it on every environment**, including local development: each environment writes and reads the configuration files. On Umbraco Cloud, add it to the project once and it reaches every environment with the next deployment.

## How it works

Each evaluator configuration is a Deploy **schema item**, like a document type. Whenever a configuration is created, edited, activated, deactivated or deleted, its file under `umbraco/Deploy/Revision` (`*.uda`, entity type `proworks-ai-evaluator-config`) is updated. Commit those files with your code; when they reach the next environment, Deploy imports them. Configurations are processed after the AI connections, profiles and contexts they depend on.

### What deploys

Every configuration, active or inactive, with:

- its name, description and document type
- the AI profile (a dependency, deployed by Umbraco.AI.Deploy) and the optional AI context (also a dependency)
- the prompt, the selected fields, and the scoring and recommendation settings
- its active state

### What doesn't

- **Record fields.** The target keeps its own created date and creator. A deployed change counts as an edit: the target's modified date and edit-conflict counter update (so an administrator with the form open is warned before overwriting it), and the modifier is left blank because the change was made by the system.
- **Cached evaluations.** They stay on each environment. When a deploy changes a configuration, the cached evaluations for that document type are cleared on the target, so editors get a fresh evaluation next time.

### The source's active state wins

After a deploy, each configuration is active or inactive exactly as in the source. Activating one deactivates any other active configuration for the same document type on the target. Deploying an inactive configuration never activates another one, so a document type can be left with no active configuration if that is what the source has.

### First deploy: hand-made configurations are adopted

If an environment already has a configuration that was made by hand, the first deploy adopts it instead of creating a duplicate when **exactly one** target configuration has the same document type and name (ignoring case and surrounding spaces). The adopted configuration takes the source's id, so later deploys keep updating the same one.

If **several** target configurations match, none is adopted: the source configuration is added as a new one and a warning naming the matches is logged. Rename or delete the extras and deploy again. Target configurations that match nothing are left alone.

### Deletes need Deploy's schema clean-up

Deleting a configuration in the source removes its file. Like a deleted document type, it is removed from the target **only when that environment runs Deploy's schema clean-up**:

```json
{
  "Umbraco": {
    "Deploy": {
      "Settings": {
        "PostDeploySchemaOperation": "CleanSchema"
      }
    }
  }
}
```

A `deploy-clean` trigger file or a delete from Deploy's schema comparison dashboard does the same. Without the clean-up, deleted configurations stay on the target (deactivate them in the source instead if you want them out of use everywhere).

The clean-up only removes configurations that arrived through a deploy (created or adopted by one). Configurations made by hand on an environment are never deleted by it, and deleting one never promotes another configuration to active.

### Missing dependencies

- **Document type missing on the target:** the configuration still deploys and a warning is logged. It is used once the document type exists.
- **AI profile missing on the target:** the item fails and Deploy reports it. Profiles are deployed as dependencies by Umbraco.AI.Deploy; check that the profile (and its connection) exists in the source and is deployed too.

## Automations

Automations that use the **Evaluate Page** step from `ProWorks.Umbraco.AI.PageEvaluator.Automate` move with Automate's own Deploy support (`Umbraco.Deploy.Automate`). The step's settings contain no environment-specific ids, so they work on the target as they are. Install the Automate add-on on every environment the automation goes to.

## More

Full documentation, the main package and source: https://github.com/ProWorksCorporation/ProWorks-Umbraco.AI-Page-Evaluator

Read the overview and setup walkthrough: https://www.proworks.com/blog/archive/umbraco-ai-page-evaluator/