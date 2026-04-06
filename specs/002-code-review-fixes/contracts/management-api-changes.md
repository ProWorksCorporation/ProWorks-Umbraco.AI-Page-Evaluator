# API Contract Changes: Code Review Fixes

Base path: `/umbraco/management/api/v1/page-evaluator`

## Changed Endpoints

### POST /configurations — Authorization Tightened (Phase 2)

**Before**: `BackOfficeAccess` policy
**After**: `SectionAccessSettings` policy (requires Settings section access)

No request/response shape changes except:
- Request body adds optional `propertyAliases` field (Phase 4)
- Response body adds `propertyAliases` field (Phase 4)

### PUT /configurations/{id} — Authorization Tightened (Phase 2)

Same authorization change as POST.

Same request/response additions for `propertyAliases` (Phase 4).

### DELETE /configurations/{id} — Authorization Tightened (Phase 2)

Same authorization change as POST.

### POST /configurations/{id}/activate — Authorization Tightened (Phase 2)

Same authorization change as POST.

### POST /evaluate — Error Response Changes (Phase 2) + Rate Limiting (Phase 5)

**Error responses changed**:
- `502` response body: `detail` field now contains generic message instead of provider exception text
- New `500` catch-all for non-HTTP, non-cancellation exceptions with generic detail
- New `429` response when rate limit exceeded (Phase 5)

**Rate limit headers** (Phase 5):
- `Retry-After: <seconds>` on 429 responses
- `X-RateLimit-Limit: 1`
- `X-RateLimit-Remaining: 0|1`

### GET /configurations, GET /configurations/{id}, GET /configurations/active/{alias}

Response body adds `propertyAliases: string[] | null` field (Phase 4).

## Request/Response Shape Changes (Phase 4)

### CreateEvaluatorConfigRequest

```json
{
  "name": "string",
  "description": "string | null",
  "documentTypeAlias": "string",
  "profileId": "guid",
  "contextId": "guid | null",
  "promptText": "string",
  "propertyAliases": ["string"] | null  // NEW — null means all properties
}
```

### UpdateEvaluatorConfigRequest

Same addition as CreateEvaluatorConfigRequest.

### EvaluatorConfigResponse

```json
{
  // ... existing fields ...
  "propertyAliases": ["string"] | null  // NEW
}
```

## Unchanged Endpoints

- `GET /evaluate/cached/{nodeId}` — no changes
- `GET /document-type/{alias}/properties` — no changes (already returns property list used for checkbox UI)
