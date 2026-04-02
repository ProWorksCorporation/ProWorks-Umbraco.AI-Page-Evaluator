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
    }
}
