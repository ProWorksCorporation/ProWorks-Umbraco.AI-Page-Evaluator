# API Contracts: Page Evaluator Management API

All endpoints are Umbraco Management API controllers.
Base path: `/umbraco/management/api/v1/page-evaluator`
Authentication: Umbraco back-office bearer token (standard for all Management API calls).
All request/response bodies are `application/json`.

---

## Evaluator Configuration Endpoints

### GET /configurations

Returns all EvaluatorConfigurations, ordered by document type alias then updated_at descending.

**Response 200**:
```json
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Blog Post Evaluator",
      "documentTypeAlias": "blogPost",
      "profileId": "a1b2c3d4-0000-0000-0000-000000000001",
      "profileName": "OpenAI GPT-4o",
      "contextId": "a1b2c3d4-0000-0000-0000-000000000002",
      "contextName": "Brand Guidelines",
      "promptText": "You are a blog post quality auditor...",
      "isActive": true,
      "dateCreated": "2026-03-30T12:00:00",
      "dateModified": "2026-03-30T12:00:00"
    }
  ],
  "total": 1
}
```

---

### GET /configurations/{id}

Returns a single EvaluatorConfiguration by its GUID.

**Response 200**: Single configuration object (same shape as items[] above).
**Response 404**: `{ "title": "Evaluator configuration not found" }`

---

### GET /configurations/active/{documentTypeAlias}

Returns the active EvaluatorConfiguration for a given document type alias. Used by the
workspace action to determine whether to show the "Evaluate Page" button.

**Response 200**: Single configuration object.
**Response 404**: No active configuration for this document type — button must be hidden.

---

### POST /configurations

Creates a new EvaluatorConfiguration. The new record immediately becomes the active one
for its document type; all prior configurations for that alias are deactivated.

**Request body**:
```json
{
  "name": "Blog Post Evaluator",
  "documentTypeAlias": "blogPost",
  "profileId": "a1b2c3d4-0000-0000-0000-000000000001",
  "contextId": "a1b2c3d4-0000-0000-0000-000000000002",
  "promptText": "You are a blog post quality auditor..."
}
```

**Validation**:
- `name`: required, non-empty
- `documentTypeAlias`: required, must resolve to an existing Umbraco document type
- `profileId`: required, must be a valid Guid resolving to a configured Umbraco.AI profile
- `contextId`: optional Guid; if provided must resolve to a configured Umbraco.AI context
- `promptText`: required, non-empty

**Response 201**: Created configuration object with generated `id`.
**Response 422**: `{ "errors": { "name": ["Name is required"], ... } }`

---

### PUT /configurations/{id}

Updates an existing EvaluatorConfiguration. Saving makes this record the active one
for its document type.

**Request body**: Same shape as POST (all fields required), plus `version` (int) for
optimistic concurrency. The `version` value must match the version last read by the
client; if another user has saved in the meantime the server returns 409.

**Response 200**: Updated configuration object.
**Response 404**: Not found.
**Response 409**: Concurrency conflict — the configuration was modified by another user since the client last read it.
**Response 422**: Validation errors.

---

### DELETE /configurations/{id}

Deletes an EvaluatorConfiguration. If the deleted record was the active one, the next
most recently updated configuration for the same document type (if any) becomes active.

**Response 204**: No content.
**Response 404**: Not found.

---

## Evaluation Endpoint

### POST /evaluate

Triggers an AI evaluation for a page. Called by the workspace action when the editor
opens the slide-in dialog. The server fetches the active EvaluatorConfiguration for
the document type, composes the prompt with Context instructions and property data,
calls `IChatClient`, parses the response, and returns a structured report.

**Request body**:
```json
{
  "nodeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "documentTypeAlias": "blogPost",
  "properties": {
    "blogNavigationImage": { "mediaKey": "abc123" },
    "postDate": "2026-03-30T00:00:00",
    "summary": "A short summary of the post...",
    "content": [
      {
        "contentTypeAlias": "richTextComponent",
        "values": { "text": "<p>Body content here</p>" }
      }
    ]
  }
}
```

**Notes**:
- `properties` is a flat or nested JSON map of property alias → current editor value.
- Nested block list content is included as arrays under the property alias.
- The back-office serialises the current draft values (not saved/published state).

**Response 200 — structured report**:
```json
{
  "parseFailed": false,
  "score": {
    "passed": 14,
    "total": 17,
    "displayText": "14/17 checks passed"
  },
  "checks": [
    {
      "checkNumber": 1,
      "status": "Pass",
      "label": "Blog Navigation Image",
      "explanation": null
    },
    {
      "checkNumber": 2,
      "status": "Fail",
      "label": "Meta Description",
      "explanation": "Meta description is empty. Add 1-2 sentences (max 160 characters) describing the post."
    },
    {
      "checkNumber": 7,
      "status": "Warn",
      "label": "Browser Title",
      "explanation": "Browser title exceeds 60 characters (currently 74). Consider shortening."
    }
  ],
  "suggestions": "Consider adding internal links to related blog posts. The H1 matches the node name — a Title Override may improve SEO.",
  "rawResponse": null
}
```

**Response 200 — parse failed**:
```json
{
  "parseFailed": true,
  "score": null,
  "checks": [],
  "suggestions": null,
  "rawResponse": "Here is my evaluation of the blog post:\n\nThe post looks mostly complete but..."
}
```

**Response 404**: No active EvaluatorConfiguration for the given document type alias.
**Response 502**: AI provider returned an error. Body: `{ "title": "AI provider error", "detail": "The request to the AI provider failed. Please try again." }`

---

## Profile and Context Selection

> **Note**: Profile and context selection in the evaluator configuration form uses
> `<uai-profile-picker>` and `<uai-context-picker>` from `@umbraco-ai/core` directly.
> These components call the Umbraco.AI Management API internally. No additional
> `/profiles` or `/contexts` endpoints are needed in this package's controller.
>
> Server-side, `IAIProfileService` and `IAIContextService` (both from `Umbraco.AI.Core`)
> are injected into `PageEvaluationService` to resolve profile and context data by alias
> when composing the AI request at evaluation time.

---

## Error Response Shape (all endpoints)

```json
{
  "title": "Human-readable error summary",
  "detail": "Optional longer explanation",
  "errors": {
    "fieldName": ["Validation message"]
  }
}
```

HTTP status codes used: `200`, `201`, `404`, `422` (validation), `502` (upstream AI error).
