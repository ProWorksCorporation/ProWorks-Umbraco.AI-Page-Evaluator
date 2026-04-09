# ProWorks Umbraco AI Page Evaluator

AI-powered page evaluation for the Umbraco 17 back-office using the [Umbraco.AI](https://umbraco.com/marketplace/umbraco-ai/) framework.

## What it does

Adds an **Evaluate Page** workspace action to the Umbraco content editor. Clicking it sends the current page's content to a configured AI model and returns a structured quality report directly inside the back-office, including scored checks, warnings, and actionable suggestions.

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
- Prompt builder in configuration to help with setup
