# ProWorks Umbraco AI Page Evaluator

AI-powered page evaluation for the Umbraco 17 back-office using the [Umbraco.AI](https://umbraco.com/marketplace/umbraco-ai/) framework.

## What it does

Adds an **Evaluate Page** workspace action to the Umbraco content editor. Clicking it sends the current page's content to a configured AI model and returns a structured quality report directly inside the back-office, including scored checks, warnings, and actionable suggestions.

## Requirements

| Dependency | Version |
|---|---|
| Umbraco CMS | 17.8.0+ (17.x) |
| Umbraco.AI | 17.6.1+ (17.x) |
| .NET | 10 |

Upgrade the CMS and Umbraco.AI first, then this package (on an older CMS the install fails with NU1605 "package downgrade" for `Umbraco.Cms`). Sites that can't upgrade yet can stay on 17.3.1. Existing configurations and cached results are kept.

## Quick Start

1. Install this package
2. Run your Umbraco site (migrations apply automatically on startup)
3. Go to **Settings → Umbraco.AI Add-ons → Page Evaluator** and create an evaluator configuration
4. Open any content node of that document type and the **Evaluate Page** button appears in the toolbar

## Key Features

- Per-document-type evaluator configurations with custom AI prompts
- Supports any AI provider configured in Umbraco.AI (Anthropic, OpenAI, etc.)
- Cached results with timestamp and one-click re-evaluation
- Workspace action hidden automatically on unconfigured document types
- Tells administrators when scores may vary: a notice appears on the configuration screen when the selected AI model ignores the deterministic-output (temperature) setting, as OpenAI reasoning models and newer Claude models do
- AI text recommendations for Fail and Warn checks — the recommendation panel shows the current field value alongside the AI suggestion so you can compare before applying or copying it to the clipboard; Rich Text can be applied directly (withheld if embedded blocks would be lost)
- Multilingual aware: evaluations, recommendations, Apply and the cache follow the language you're viewing
- Warns on the configuration screen when the selected AI profile has its own system prompt, which Umbraco.AI 17.5+ sends ahead of the evaluator's instructions; the evaluator's own format, language and tone rules are marked as taking precedence, but a dedicated profile with no system prompt gives the most predictable results
- Shows Umbraco.AI's AI disclosure notice with evaluator output, following the site's Always / Dismissible / Off setting (default Always)
- Localized "could not reach" message when the network drops, instead of a technical error

## About ProWorks

[ProWorks Corporation](https://www.proworks.com/umbraco-platinum-partner/) is an **Umbraco Platinum Partner** based in the USA. We have been building and maintaining Umbraco implementations since the early versions of the platform, certified across Umbraco 7 through 17 LTS, and we have three Umbraco MVPs on staff. We work with organizations across many industries including credit unions, insurers, public agencies, travel, higher education, and manufacturers. Our approach is consultative: we will meet you where you are and recommend the right next step, even if that means doing less.

This package evaluates individual pages on demand. If you're interested in understanding how AI systems interpret your organization's content across your **entire website**, ProWorks offers a site-wide **Content Evaluator service** that delivers an AI Perspective Report on your positioning, messaging, and audience signals based on your publicly available content.

Learn more at [proworks.com/ai](https://www.proworks.com/ai) or [contact us](https://www.proworks.com/contact) to discuss your project.

## Links

- [NuGet package](https://www.nuget.org/packages/ProWorks.Umbraco.AI.PageEvaluator)
- [Source & full documentation](https://github.com/ProWorksCorporation/ProWorks-Umbraco.AI-Page-Evaluator)
- [ProWorks AI services](https://www.proworks.com/ai)
- [ProWorks Corporation](https://www.proworks.com)
