using System.Text.Json;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Evaluators;

/// <summary>
/// Bidirectional mapper between <see cref="AIEvaluatorConfig"/> (domain) and
/// <see cref="AIEvaluatorConfigEntity"/> (EFCore entity).
/// </summary>
public static class AIEvaluatorConfigEntityFactory
{
    /// <summary>Maps an EFCore entity to a domain model.</summary>
    public static AIEvaluatorConfig ToDomain(AIEvaluatorConfigEntity entity) =>
        new()
        {
            Id = entity.Id,
            Name = entity.Name,
            Description = entity.Description,
            DocumentTypeAlias = entity.DocumentTypeAlias,
            ProfileId = entity.ProfileId,
            ContextId = entity.ContextId,
            PromptText = entity.PromptText,
            IsActive = entity.IsActive,
            DateCreated = entity.DateCreated,
            DateModified = entity.DateModified,
            CreatedByUserId = entity.CreatedByUserId,
            ModifiedByUserId = entity.ModifiedByUserId,
            Version = entity.Version,
            PropertyAliases = DeserializePropertyAliases(entity.PropertyAliases),
            ScoringEnabled = entity.ScoringEnabled,
        };

    /// <summary>Maps a domain model to a new EFCore entity (for inserts).</summary>
    public static AIEvaluatorConfigEntity ToEntity(AIEvaluatorConfig domain) =>
        new()
        {
            Id = domain.Id == Guid.Empty ? Guid.NewGuid() : domain.Id,
            Name = domain.Name,
            Description = domain.Description,
            DocumentTypeAlias = domain.DocumentTypeAlias,
            ProfileId = domain.ProfileId,
            ContextId = domain.ContextId,
            PromptText = domain.PromptText,
            IsActive = domain.IsActive,
            DateCreated = domain.DateCreated == default ? DateTime.UtcNow : domain.DateCreated,
            DateModified = DateTime.UtcNow,
            CreatedByUserId = domain.CreatedByUserId,
            ModifiedByUserId = domain.ModifiedByUserId,
            Version = domain.Version,
            PropertyAliases = SerializePropertyAliases(domain.PropertyAliases),
            ScoringEnabled = domain.ScoringEnabled,
        };

    /// <summary>Applies domain model changes onto an existing tracked EFCore entity (for updates).</summary>
    public static void ApplyToEntity(AIEvaluatorConfig domain, AIEvaluatorConfigEntity entity)
    {
        entity.Name = domain.Name;
        entity.Description = domain.Description;
        entity.DocumentTypeAlias = domain.DocumentTypeAlias;
        entity.ProfileId = domain.ProfileId;
        entity.ContextId = domain.ContextId;
        entity.PromptText = domain.PromptText;
        entity.IsActive = domain.IsActive;
        entity.DateModified = DateTime.UtcNow;
        entity.ModifiedByUserId = domain.ModifiedByUserId;
        entity.Version = domain.Version + 1;
        entity.PropertyAliases = SerializePropertyAliases(domain.PropertyAliases);
        entity.ScoringEnabled = domain.ScoringEnabled;
    }

    private static string? SerializePropertyAliases(List<string>? aliases)
        => aliases is { Count: > 0 } ? JsonSerializer.Serialize(aliases) : null;

    private static List<string>? DeserializePropertyAliases(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<List<string>>(json); }
        catch (JsonException) { return null; }
    }
}
