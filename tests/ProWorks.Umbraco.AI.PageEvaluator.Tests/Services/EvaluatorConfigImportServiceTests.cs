using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
using Umbraco.Cms.Core.Events;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// <see cref="EvaluatorConfigImportService"/> (006 contracts/deploy-artifact.md §1.2, data-model §2): the deploy-only
/// write path used by the Deploy add-on's connector. The repository is an in-memory fake with the EF repository's
/// semantics (save bumps Version and enforces the active-one rule; SetInactive touches one row) and a call log, so
/// the tests can check both the stored result and the order of the repository calls.
/// </summary>
public class EvaluatorConfigImportServiceTests
{
    private static readonly Guid ProfileId = Guid.NewGuid();
    private static readonly Guid ContextId = Guid.NewGuid();
    private static readonly DateTime TargetCreated = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime TargetModified = new(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc);

    private readonly FakeConfigRepository _repository = new();
    private readonly IEvaluationCacheRepository _cache = Substitute.For<IEvaluationCacheRepository>();
    private readonly IAIProfileService _profileService = Substitute.For<IAIProfileService>();
    private readonly IAIContextService _contextService = Substitute.For<IAIContextService>();
    private readonly IEventAggregator _eventAggregator = Substitute.For<IEventAggregator>();
    private readonly ILogger<EvaluatorConfigImportService> _logger = Substitute.For<ILogger<EvaluatorConfigImportService>>();
    private readonly EvaluatorConfigImportService _sut;

    public EvaluatorConfigImportServiceTests()
    {
        _profileService.GetProfileAsync(ProfileId, Arg.Any<CancellationToken>())
            .Returns(new AIProfile { Alias = "p", Name = "Profile", ConnectionId = Guid.Empty });
        _contextService.GetContextAsync(ContextId, Arg.Any<CancellationToken>())
            .Returns(new AIContext { Alias = "c", Name = "Context" });
        _sut = new EvaluatorConfigImportService(_repository, _cache, _profileService, _contextService, _eventAggregator, _logger);
    }

    private static AIEvaluatorConfig Incoming(Guid id, string alias = "blogPost", bool isActive = true, Guid? contextId = null) => new()
    {
        Id = id,
        Name = "Blog checks",
        Description = "From dev.",
        DocumentTypeAlias = alias,
        ProfileId = ProfileId,
        ContextId = contextId,
        PromptText = "Check the blog post.",
        PropertyAliases = ["title", "body"],
        ScoringEnabled = true,
        RecommendationsEnabled = false,
        IsActive = isActive,
        // Source record fields: never copied.
        Version = 99,
        DateCreated = new DateTime(2020, 5, 5, 0, 0, 0, DateTimeKind.Utc),
        DateModified = new DateTime(2020, 6, 6, 0, 0, 0, DateTimeKind.Utc),
        CreatedByUserId = Guid.NewGuid(),
        ModifiedByUserId = Guid.NewGuid(),
        IsDeployManaged = false,
    };

    private static AIEvaluatorConfig Target(Guid id, string alias = "blogPost", bool isActive = false, string name = "Target", bool isDeployManaged = false) => new()
    {
        Id = id,
        Name = name,
        Description = "Hand-made.",
        DocumentTypeAlias = alias,
        ProfileId = Guid.NewGuid(),
        PromptText = "Old prompt.",
        IsActive = isActive,
        Version = 4,
        DateCreated = TargetCreated,
        DateModified = TargetModified,
        CreatedByUserId = Guid.NewGuid(),
        ModifiedByUserId = Guid.NewGuid(),
        IsDeployManaged = isDeployManaged,
    };

    private List<object> Published() => _eventAggregator.ReceivedCalls()
        .Where(c => c.GetMethodInfo().Name == nameof(IEventAggregator.PublishAsync))
        .Select(c => c.GetArguments()[0]!)
        .ToList();

    private List<Guid> SavedIds() => Published().OfType<EvaluatorConfigSavedNotification>().Select(n => n.Entity.Id).ToList();

    private List<Guid> DeletedIds() => Published().OfType<EvaluatorConfigDeletedNotification>().Select(n => n.EntityId).ToList();

    // -------------------------------------------------------------------------
    // ImportAsync — existing row
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ImportAsync_ExistingRow_CopiesTheDeployableFields_AndKeepsTheTargetsRecordFields()
    {
        var id = Guid.NewGuid();
        AIEvaluatorConfig target = Target(id);
        _repository.Seed(target);
        DateTime before = DateTime.UtcNow;

        AIEvaluatorConfig result = await _sut.ImportAsync(Incoming(id, isActive: false));

        AIEvaluatorConfig stored = _repository.Stored(id)!;
        Assert.Equal("Blog checks", stored.Name);
        Assert.Equal("From dev.", stored.Description);
        Assert.Equal("blogPost", stored.DocumentTypeAlias);
        Assert.Equal(ProfileId, stored.ProfileId);
        Assert.Null(stored.ContextId);
        Assert.Equal("Check the blog post.", stored.PromptText);
        Assert.Equal(["title", "body"], stored.PropertyAliases);
        Assert.True(stored.ScoringEnabled);
        Assert.False(stored.RecommendationsEnabled);
        // Record fields: the target's own, never the source's (spec US4 scenario 7).
        Assert.Equal(TargetCreated, stored.DateCreated);
        Assert.Equal(target.CreatedByUserId, stored.CreatedByUserId);
        Assert.Null(stored.ModifiedByUserId);
        Assert.True(stored.DateModified >= before);
        Assert.Equal(5, stored.Version); // the target's 4, + 1 like any edit
        Assert.True(stored.IsDeployManaged);
        Assert.Equal(5, result.Version);
        Assert.Equal(id, result.Id);
    }

    [Fact]
    public async Task ImportAsync_ExistingRow_UpdatesTheDeployedFieldsWriteFirst_WithTheTargetsVersionAsOriginal_ThenActivates()
    {
        var id = Guid.NewGuid();
        _repository.Seed(Target(id, isActive: false));

        await _sut.ImportAsync(Incoming(id, isActive: true));

        // Never SaveAsync (it reads before writing: "database is locked" on SQLite under concurrent commits).
        AIEvaluatorConfig updated = Assert.Single(_repository.FieldUpdates);
        Assert.Equal(4, updated.Version);     // concurrency original = the target's own Version (not the source's 99)
        Assert.True(updated.IsDeployManaged);
        Assert.Equal(["UpdateDeployedFields", "SetActive"], _repository.Writes); // activation is applied after it
        Assert.True(_repository.Stored(id)!.IsActive);
    }

    [Fact]
    public async Task ImportAsync_ExistingActiveRow_DeployedInactive_IsDeactivatedAfterTheSave()
    {
        var id = Guid.NewGuid();
        _repository.Seed(Target(id, isActive: true));

        await _sut.ImportAsync(Incoming(id, isActive: false));

        Assert.Equal(["UpdateDeployedFields", "SetInactive"], _repository.Writes);
        Assert.False(_repository.Stored(id)!.IsActive);
    }

    [Fact]
    public async Task ImportAsync_ExistingActiveRow_MovedToAnotherDocumentType_DoesNotDeactivateTheNewTypesActiveConfig()
    {
        // Saving it active under the new alias would deactivate that type's active config (the active-one rule),
        // although the source deploys it inactive.
        var id = Guid.NewGuid();
        var otherActive = Guid.NewGuid();
        _repository.Seed(Target(id, alias: "blogPost", isActive: true));
        _repository.Seed(Target(otherActive, alias: "landingPage", isActive: true));

        await _sut.ImportAsync(Incoming(id, alias: "landingPage", isActive: false));

        Assert.Equal(["UpdateDeployedFields", "SetInactive"], _repository.Writes);
        Assert.True(_repository.Stored(otherActive)!.IsActive);
        Assert.False(_repository.Stored(id)!.IsActive);
        Assert.Equal("landingPage", _repository.Stored(id)!.DocumentTypeAlias);
    }

    // -------------------------------------------------------------------------
    // ImportAsync — new row
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ImportAsync_NewRow_InsertsUnderTheIncomingId_WithVersion1_AndNoSourceRecordFields()
    {
        var id = Guid.NewGuid();
        DateTime before = DateTime.UtcNow;

        AIEvaluatorConfig result = await _sut.ImportAsync(Incoming(id, isActive: false, contextId: ContextId));

        Assert.Equal(["Insert", "SetInactive"], _repository.Writes);
        AIEvaluatorConfig stored = _repository.Stored(id)!;
        Assert.Equal(1, stored.Version);
        Assert.True(stored.DateCreated >= before);
        Assert.True(stored.DateModified >= before);
        Assert.Null(stored.CreatedByUserId);
        Assert.Null(stored.ModifiedByUserId);
        Assert.True(stored.IsDeployManaged);
        Assert.False(stored.IsActive);
        Assert.Equal(ContextId, stored.ContextId);
        Assert.Equal("Blog checks", stored.Name);
        Assert.Equal(id, result.Id);
    }

    [Fact]
    public async Task ImportAsync_NewActiveRow_ActivatesIt_AndDeactivatesTheSibling()
    {
        var id = Guid.NewGuid();
        var sibling = Guid.NewGuid();
        _repository.Seed(Target(sibling, isActive: true));

        await _sut.ImportAsync(Incoming(id, isActive: true));

        Assert.Equal(["Insert", "SetActive"], _repository.Writes);
        Assert.True(_repository.Stored(id)!.IsActive);
        Assert.False(_repository.Stored(sibling)!.IsActive);
        // Saved for the imported row and for the sibling it deactivated.
        Assert.Equal([id, sibling], SavedIds());
        Assert.Empty(DeletedIds());
    }

    [Fact]
    public async Task ImportAsync_InactiveRow_NeverActivatesOrDeactivatesAnotherConfig()
    {
        var id = Guid.NewGuid();
        var sibling = Guid.NewGuid();
        _repository.Seed(Target(sibling, isActive: true));

        await _sut.ImportAsync(Incoming(id, isActive: false));

        Assert.DoesNotContain("SetActive", _repository.Writes);
        Assert.True(_repository.Stored(sibling)!.IsActive);
        Assert.Equal([id], SavedIds());
    }

    [Fact]
    public async Task ImportAsync_NeverDeletesWithPromotion()
    {
        var id = Guid.NewGuid();
        _repository.Seed(Target(id, isActive: true));

        await _sut.ImportAsync(Incoming(id, isActive: false));

        Assert.DoesNotContain("Delete", _repository.Writes);
    }

    // -------------------------------------------------------------------------
    // ImportAsync — dependencies, cache, notifications
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ImportAsync_MissingProfile_ThrowsInvalidOperation_AndWritesNothing()
    {
        AIEvaluatorConfig incoming = Incoming(Guid.NewGuid());
        incoming.ProfileId = Guid.NewGuid();

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.ImportAsync(incoming));

        Assert.Empty(_repository.Writes);
    }

    [Fact]
    public async Task ImportAsync_MissingContext_ThrowsInvalidOperation_AndWritesNothing()
    {
        AIEvaluatorConfig incoming = Incoming(Guid.NewGuid(), contextId: Guid.NewGuid());

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.ImportAsync(incoming));

        Assert.Empty(_repository.Writes);
    }

    [Fact]
    public async Task ImportAsync_ClearsTheCacheForTheNewAndThePreviousDocumentType()
    {
        var id = Guid.NewGuid();
        _repository.Seed(Target(id, alias: "blogPost"));

        await _sut.ImportAsync(Incoming(id, alias: "landingPage"));

        await _cache.Received(1).DeleteByDocumentTypeAliasAsync("landingPage", Arg.Any<CancellationToken>());
        await _cache.Received(1).DeleteByDocumentTypeAliasAsync("blogPost", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ImportAsync_ClearsTheCacheOnce_WhenTheDocumentTypeIsUnchanged()
    {
        var id = Guid.NewGuid();
        _repository.Seed(Target(id, alias: "blogPost"));

        await _sut.ImportAsync(Incoming(id, alias: "blogPost"));

        await _cache.Received(1).DeleteByDocumentTypeAliasAsync("blogPost", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ImportAsync_ACacheFailure_IsLoggedAndNotThrown()
    {
        _cache.DeleteByDocumentTypeAliasAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("no such table"));
        var id = Guid.NewGuid();

        AIEvaluatorConfig result = await _sut.ImportAsync(Incoming(id));

        Assert.Equal(id, result.Id);
        Assert.NotNull(_repository.Stored(id));
        _logger.Received().Log(LogLevel.Warning, Arg.Any<EventId>(), Arg.Any<object>(),
            Arg.Any<InvalidOperationException>(), Arg.Any<Func<object, Exception?, string>>());
    }

    [Fact]
    public async Task ImportAsync_ExistingRow_PublishesSavedWithTheStoredState()
    {
        var id = Guid.NewGuid();
        _repository.Seed(Target(id, isActive: false));

        await _sut.ImportAsync(Incoming(id, isActive: true));

        EvaluatorConfigSavedNotification saved = Assert.Single(Published().OfType<EvaluatorConfigSavedNotification>());
        Assert.Equal(id, saved.Entity.Id);
        Assert.True(saved.Entity.IsActive);
        Assert.Equal(5, saved.Entity.Version);
        Assert.Equal("Blog checks", saved.Entity.Name);
    }

    [Fact]
    public async Task ImportAsync_ANotificationHandlerFailure_IsLoggedAndNotThrown()
    {
        _eventAggregator.PublishAsync(Arg.Any<EvaluatorConfigSavedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new IOException("disk full"));
        var id = Guid.NewGuid();

        AIEvaluatorConfig result = await _sut.ImportAsync(Incoming(id));

        Assert.Equal(id, result.Id);
    }

    // -------------------------------------------------------------------------
    // FindAdoptionCandidatesAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task FindAdoptionCandidatesAsync_MatchesTheDocumentTypeAndTrimmedName_IgnoringCase()
    {
        var match1 = Guid.NewGuid();
        var match2 = Guid.NewGuid();
        _repository.Seed(Target(match1, alias: "blogPost", name: "  Blog Checks "));
        _repository.Seed(Target(match2, alias: "BlogPost", name: "blog checks"));
        _repository.Seed(Target(Guid.NewGuid(), alias: "blogPost", name: "Blog checks v2"));
        _repository.Seed(Target(Guid.NewGuid(), alias: "landingPage", name: "Blog checks"));

        IReadOnlyList<AIEvaluatorConfig> candidates = await _sut.FindAdoptionCandidatesAsync("blogpost", " BLOG CHECKS");

        Assert.Equal(new HashSet<Guid> { match1, match2 }, candidates.Select(c => c.Id).ToHashSet());
    }

    [Fact]
    public async Task FindAdoptionCandidatesAsync_NoMatch_ReturnsEmpty()
    {
        _repository.Seed(Target(Guid.NewGuid(), name: "Other"));

        Assert.Empty(await _sut.FindAdoptionCandidatesAsync("blogPost", "Blog checks"));
    }

    // -------------------------------------------------------------------------
    // AdoptAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task AdoptAsync_ReKeysTheConfig_AndPublishesDeletedForTheOldIdAndSavedForTheNew()
    {
        var oldId = Guid.NewGuid();
        var newId = Guid.NewGuid();
        _repository.Seed(Target(oldId, isActive: true));

        AIEvaluatorConfig result = await _sut.AdoptAsync(oldId, newId);

        Assert.Equal(["ReplaceId"], _repository.Writes);
        Assert.Equal(newId, result.Id);
        Assert.True(result.IsDeployManaged);
        Assert.Null(_repository.Stored(oldId));
        Assert.NotNull(_repository.Stored(newId));
        Assert.Equal([newId], SavedIds());
        Assert.Equal([oldId], DeletedIds());
    }

    [Fact]
    public async Task AdoptAsync_WhenTheNewIdExists_ThrowsAndChangesNothing()
    {
        var oldId = Guid.NewGuid();
        var newId = Guid.NewGuid();
        _repository.Seed(Target(oldId));
        _repository.Seed(Target(newId));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.AdoptAsync(oldId, newId));

        Assert.Empty(_repository.Writes);
        Assert.Empty(Published());
    }

    [Fact]
    public async Task AdoptAsync_WhenTheExistingIdIsMissing_Throws()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.AdoptAsync(Guid.NewGuid(), Guid.NewGuid()));

        Assert.Empty(_repository.Writes);
    }

    // -------------------------------------------------------------------------
    // DeleteManagedAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task DeleteManagedAsync_DeployManagedConfig_IsDeletedWithoutPromotion()
    {
        var id = Guid.NewGuid();
        var sibling = Guid.NewGuid();
        _repository.Seed(Target(id, isActive: true, isDeployManaged: true));
        _repository.Seed(Target(sibling, isActive: false));

        bool deleted = await _sut.DeleteManagedAsync(id);

        Assert.True(deleted);
        Assert.Equal(["DeleteWithoutPromotion"], _repository.Writes);
        Assert.Null(_repository.Stored(id));
        Assert.False(_repository.Stored(sibling)!.IsActive);
        await _cache.Received(1).DeleteByDocumentTypeAliasAsync("blogPost", Arg.Any<CancellationToken>());
        Assert.Equal([id], DeletedIds());
        Assert.Empty(SavedIds());
    }

    [Fact]
    public async Task DeleteManagedAsync_HandMadeConfig_ReturnsFalse_AndChangesNothing()
    {
        var id = Guid.NewGuid();
        _repository.Seed(Target(id, isActive: true, isDeployManaged: false));

        bool deleted = await _sut.DeleteManagedAsync(id);

        Assert.False(deleted);
        Assert.Empty(_repository.Writes);
        Assert.NotNull(_repository.Stored(id));
        await _cache.DidNotReceive().DeleteByDocumentTypeAliasAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        Assert.Empty(Published());
    }

    [Fact]
    public async Task DeleteManagedAsync_MissingConfig_ReturnsFalse()
    {
        Assert.False(await _sut.DeleteManagedAsync(Guid.NewGuid()));
        Assert.Empty(_repository.Writes);
    }

    // -------------------------------------------------------------------------
    // Fake repository with the EF repository's semantics
    // -------------------------------------------------------------------------

    private sealed class FakeConfigRepository : IAIEvaluatorConfigRepository
    {
        private readonly Dictionary<Guid, AIEvaluatorConfig> _rows = new();

        public List<string> Writes { get; } = new();
        public List<AIEvaluatorConfig> FieldUpdates { get; } = new();

        public void Seed(AIEvaluatorConfig config) => _rows[config.Id] = Clone(config);

        public AIEvaluatorConfig? Stored(Guid id) => _rows.TryGetValue(id, out AIEvaluatorConfig? row) ? Clone(row) : null;

        public Task<AIEvaluatorConfig?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult(Stored(id));

        public Task<IReadOnlyList<AIEvaluatorConfig>> GetByDocumentTypeAliasAsync(string documentTypeAlias, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<AIEvaluatorConfig>>(_rows.Values
                .Where(r => r.DocumentTypeAlias == documentTypeAlias).Select(Clone).ToList());

        public Task<IReadOnlyList<AIEvaluatorConfig>> GetAllAsync(CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<AIEvaluatorConfig>>(_rows.Values.Select(Clone).ToList());

        public Task<AIEvaluatorConfig?> GetActiveForDocumentTypeAsync(string documentTypeAlias, CancellationToken cancellationToken = default)
            => Task.FromResult(_rows.Values.Where(r => r.DocumentTypeAlias == documentTypeAlias && r.IsActive).Select(Clone).FirstOrDefault());

        public Task SaveAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default)
        {
            Writes.Add("Save");
            throw new InvalidOperationException("The import service must update existing rows with UpdateDeployedFieldsAsync (write-first).");
        }

        public Task UpdateDeployedFieldsAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default)
        {
            Writes.Add("UpdateDeployedFields");
            FieldUpdates.Add(Clone(config));
            if (!_rows.TryGetValue(config.Id, out AIEvaluatorConfig? existing) || existing.Version != config.Version)
                throw new InvalidOperationException("Concurrency conflict (Version).");

            AIEvaluatorConfig stored = Clone(config);
            stored.IsActive = existing.IsActive && existing.DocumentTypeAlias == config.DocumentTypeAlias;
            stored.DateCreated = existing.DateCreated;
            stored.CreatedByUserId = existing.CreatedByUserId;
            stored.DateModified = DateTime.UtcNow;
            stored.Version = existing.Version + 1;
            _rows[config.Id] = stored;
            return Task.CompletedTask;
        }

        public Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            Writes.Add("Delete");
            throw new InvalidOperationException("The import service must never delete with promotion.");
        }

        public Task SetActiveAsync(Guid id, CancellationToken cancellationToken = default)
        {
            Writes.Add("SetActive");
            if (!_rows.TryGetValue(id, out AIEvaluatorConfig? target)) return Task.CompletedTask;
            foreach (AIEvaluatorConfig row in _rows.Values.Where(r => r.DocumentTypeAlias == target.DocumentTypeAlias))
                row.IsActive = row.Id == id;
            return Task.CompletedTask;
        }

        public Task<bool> AliasExistsAsync(string documentTypeAlias, CancellationToken cancellationToken = default)
            => Task.FromResult(_rows.Values.Any(r => r.DocumentTypeAlias == documentTypeAlias));

        public Task SetInactiveAsync(Guid id, CancellationToken cancellationToken = default)
        {
            Writes.Add("SetInactive");
            if (_rows.TryGetValue(id, out AIEvaluatorConfig? row)) row.IsActive = false;
            return Task.CompletedTask;
        }

        public Task InsertWithIdAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default)
        {
            Writes.Add("Insert");
            if (_rows.ContainsKey(config.Id)) throw new InvalidOperationException("Duplicate key.");
            _rows[config.Id] = Clone(config);
            return Task.CompletedTask;
        }

        public Task<bool> DeleteWithoutPromotionAsync(Guid id, CancellationToken cancellationToken = default)
        {
            Writes.Add("DeleteWithoutPromotion");
            return Task.FromResult(_rows.Remove(id));
        }

        public Task<AIEvaluatorConfig> ReplaceIdAsync(Guid existingId, Guid newId, CancellationToken cancellationToken = default)
        {
            Writes.Add("ReplaceId");
            if (_rows.ContainsKey(newId)) throw new InvalidOperationException("Duplicate key.");
            AIEvaluatorConfig existing = _rows[existingId];
            AIEvaluatorConfig copy = Clone(existing);
            copy.Id = newId;
            copy.IsDeployManaged = true;
            _rows.Remove(existingId);
            _rows[newId] = copy;
            return Task.FromResult(Clone(copy));
        }

        private static AIEvaluatorConfig Clone(AIEvaluatorConfig c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            DocumentTypeAlias = c.DocumentTypeAlias,
            ProfileId = c.ProfileId,
            ContextId = c.ContextId,
            PromptText = c.PromptText,
            IsActive = c.IsActive,
            DateCreated = c.DateCreated,
            DateModified = c.DateModified,
            CreatedByUserId = c.CreatedByUserId,
            ModifiedByUserId = c.ModifiedByUserId,
            Version = c.Version,
            PropertyAliases = c.PropertyAliases?.ToList(),
            ScoringEnabled = c.ScoringEnabled,
            RecommendationsEnabled = c.RecommendationsEnabled,
            IsDeployManaged = c.IsDeployManaged,
        };
    }
}
