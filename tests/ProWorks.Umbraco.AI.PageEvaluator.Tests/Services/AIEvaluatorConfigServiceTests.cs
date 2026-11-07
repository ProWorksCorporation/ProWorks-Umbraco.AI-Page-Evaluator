using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
using Umbraco.Cms.Core.Events;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// Unit tests for <see cref="AIEvaluatorConfigService"/> — US2 behaviors:
/// create sets active, duplicate doc type deactivates previous (via repository),
/// profile/context validation, and delete.
///
/// RED STATE: Tests will fail to compile until T046 updates the
/// <see cref="AIEvaluatorConfigService"/> constructor to accept
/// <see cref="IAIProfileService"/> and <see cref="IAIContextService"/>.
/// </summary>
public class AIEvaluatorConfigServiceTests
{
    private readonly IAIEvaluatorConfigRepository _repository = Substitute.For<IAIEvaluatorConfigRepository>();
    private readonly IAIProfileService _profileService = Substitute.For<IAIProfileService>();
    private readonly IAIContextService _contextService = Substitute.For<IAIContextService>();
    private readonly IEventAggregator _eventAggregator = Substitute.For<IEventAggregator>();
    private readonly ILogger<AIEvaluatorConfigService> _logger = Substitute.For<ILogger<AIEvaluatorConfigService>>();
    private readonly AIEvaluatorConfigService _sut;

    public AIEvaluatorConfigServiceTests()
    {
        // T046: constructor must accept (repository, profileService, contextService).
        // Currently accepts only (repository) — this line triggers the RED compile error.
        // 006: also IEventAggregator (Saved/Deleted notifications) and a logger.
        _sut = new AIEvaluatorConfigService(_repository, _profileService, _contextService, _eventAggregator, _logger);
    }

    // -------------------------------------------------------------------------
    // CreateAsync — active flag
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CreateAsync_SetsIsActiveTrueOnReturnedConfig()
    {
        var profileId = Guid.NewGuid();
        MockProfileExists(profileId);
        var config = NewConfig(profileId: profileId);

        var result = await _sut.CreateAsync(config, Guid.NewGuid());

        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task CreateAsync_AssignsNewId()
    {
        var profileId = Guid.NewGuid();
        MockProfileExists(profileId);
        var config = NewConfig(profileId: profileId);

        var result = await _sut.CreateAsync(config, Guid.NewGuid());

        Assert.NotEqual(Guid.Empty, result.Id);
    }

    [Fact]
    public async Task CreateAsync_CallsRepositorySaveAsync()
    {
        var profileId = Guid.NewGuid();
        MockProfileExists(profileId);
        var config = NewConfig(profileId: profileId);

        await _sut.CreateAsync(config, Guid.NewGuid());

        await _repository.Received(1).SaveAsync(config, Arg.Any<CancellationToken>());
    }

    // -------------------------------------------------------------------------
    // CreateAsync — validation (existing: name / alias / profileId / prompt)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CreateAsync_ThrowsArgumentException_WhenNameIsEmpty()
    {
        var config = NewConfig(name: "");
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateAsync(config, Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateAsync_ThrowsArgumentException_WhenDocumentTypeAliasIsEmpty()
    {
        var config = NewConfig(documentTypeAlias: "");
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateAsync(config, Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateAsync_ThrowsArgumentException_WhenProfileIdIsEmptyGuid()
    {
        var config = NewConfig(profileId: Guid.Empty);
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateAsync(config, Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateAsync_ThrowsArgumentException_WhenPromptTextIsEmpty()
    {
        var config = NewConfig(promptText: "");
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateAsync(config, Guid.NewGuid()));
    }

    // -------------------------------------------------------------------------
    // CreateAsync — ProfileId validation via IAIProfileService (T046 RED)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CreateAsync_ThrowsArgumentException_WhenProfileIdDoesNotResolve()
    {
        var unknownProfileId = Guid.NewGuid();
        _profileService.GetProfileAsync(unknownProfileId, Arg.Any<CancellationToken>())
            .Returns((AIProfile?)null);

        var config = NewConfig(profileId: unknownProfileId);

        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateAsync(config, Guid.NewGuid()));
    }

    // -------------------------------------------------------------------------
    // CreateAsync — ContextId validation via IAIContextService (T046 RED)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CreateAsync_ThrowsArgumentException_WhenContextIdDoesNotResolve()
    {
        var profileId = Guid.NewGuid();
        var contextId = Guid.NewGuid();
        MockProfileExists(profileId);
        _contextService.GetContextAsync(contextId, Arg.Any<CancellationToken>())
            .Returns((AIContext?)null);

        var config = NewConfig(profileId: profileId, contextId: contextId);

        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateAsync(config, Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateAsync_DoesNotCallContextService_WhenContextIdIsNull()
    {
        var profileId = Guid.NewGuid();
        MockProfileExists(profileId);
        var config = NewConfig(profileId: profileId, contextId: null);

        await _sut.CreateAsync(config, Guid.NewGuid());

        await _contextService.DidNotReceive().GetContextAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    // -------------------------------------------------------------------------
    // UpdateAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task UpdateAsync_PreservesDateCreatedFromExistingRecord()
    {
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var originalDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var existing = ExistingConfig(id: id, profileId: profileId, dateCreated: originalDate);
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        MockProfileExists(profileId);

        var updated = NewConfig(id: id, profileId: profileId);
        updated.Version = 1;
        var result = await _sut.UpdateAsync(updated, Guid.NewGuid());

        Assert.Equal(originalDate, result.DateCreated);
    }

    [Fact]
    public async Task UpdateAsync_PreservesIsActive_WhenExistingConfigIsActive()
    {
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var existing = ExistingConfig(id: id, profileId: profileId);
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        MockProfileExists(profileId);

        var updated = NewConfig(id: id, profileId: profileId);
        updated.Version = 1;
        var result = await _sut.UpdateAsync(updated, Guid.NewGuid());

        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task UpdateAsync_PreservesIsActive_WhenExistingConfigIsInactive()
    {
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var existing = ExistingConfig(id: id, profileId: profileId, isActive: false);
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        MockProfileExists(profileId);

        var updated = NewConfig(id: id, profileId: profileId);
        updated.Version = 1;
        var result = await _sut.UpdateAsync(updated, Guid.NewGuid());

        Assert.False(result.IsActive);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task UpdateAsync_PreservesStoredIsDeployManaged(bool stored, bool incoming)
    {
        // 006 data-model §2: IsDeployManaged is never edited in the backoffice; an edit keeps the stored value.
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var existing = ExistingConfig(id: id, profileId: profileId);
        existing.IsDeployManaged = stored;
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        MockProfileExists(profileId);

        var updated = NewConfig(id: id, profileId: profileId);
        updated.Version = 1;
        updated.IsDeployManaged = incoming;
        var result = await _sut.UpdateAsync(updated, Guid.NewGuid());

        Assert.Equal(stored, result.IsDeployManaged);
        await _repository.Received(1).SaveAsync(
            Arg.Is<AIEvaluatorConfig>(c => c.IsDeployManaged == stored), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateAsync_IsNeverDeployManaged()
    {
        var profileId = Guid.NewGuid();
        MockProfileExists(profileId);
        var config = NewConfig(profileId: profileId);
        config.IsDeployManaged = true;

        var result = await _sut.CreateAsync(config, Guid.NewGuid());

        Assert.False(result.IsDeployManaged);
    }

    [Fact]
    public async Task UpdateAsync_ReturnsCommittedVersion_WhenClientSuppliesVersion()
    {
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var existing = ExistingConfig(id: id, profileId: profileId);
        existing.Version = 2;
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        MockProfileExists(profileId);

        var updated = NewConfig(id: id, profileId: profileId);
        updated.Version = 5;
        var result = await _sut.UpdateAsync(updated, Guid.NewGuid());

        // Returned version is input+1 (what was committed to the DB by ApplyToEntity).
        Assert.Equal(6, result.Version);
    }

    [Fact]
    public async Task UpdateAsync_ThrowsArgumentException_WhenVersionIsZero()
    {
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var existing = ExistingConfig(id: id, profileId: profileId);
        existing.Version = 3;
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        MockProfileExists(profileId);

        var updated = NewConfig(id: id, profileId: profileId);
        updated.Version = 0;

        await Assert.ThrowsAsync<ArgumentException>(() => _sut.UpdateAsync(updated, Guid.NewGuid()));
    }

    [Fact]
    public async Task UpdateAsync_ThrowsInvalidOperationException_WhenConfigNotFound()
    {
        _repository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((AIEvaluatorConfig?)null);

        var config = NewConfig(id: Guid.NewGuid());

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.UpdateAsync(config, Guid.NewGuid()));
    }

    // -------------------------------------------------------------------------
    // Issue 4: UpdateAsync returns the committed version (input Version + 1)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task UpdateAsync_ReturnsVersionIncrementedByOne()
    {
        var profileId = Guid.NewGuid();
        MockProfileExists(profileId);
        var configId = Guid.NewGuid();
        var config = NewConfig(profileId: profileId);
        config.Id = configId;
        config.Version = 3;

        _repository.GetByIdAsync(configId, Arg.Any<CancellationToken>())
            .Returns(NewConfig(profileId: profileId));

        var result = await _sut.UpdateAsync(config, Guid.NewGuid());

        Assert.Equal(4, result.Version); // committed Version is input+1
    }

    // -------------------------------------------------------------------------
    // Issue 10: PromptText max length validation
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CreateAsync_WhenPromptTextExceedsMaxLength_ThrowsArgumentException()
    {
        var profileId = Guid.NewGuid();
        MockProfileExists(profileId);
        var config = NewConfig(profileId: profileId);
        config.PromptText = new string('x', 32_769); // one char over the 32 KB limit

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _sut.CreateAsync(config, Guid.NewGuid()));
    }

    [Fact]
    public async Task UpdateAsync_WhenPromptTextExceedsMaxLength_ThrowsArgumentException()
    {
        var profileId = Guid.NewGuid();
        MockProfileExists(profileId);
        var existingId = Guid.NewGuid();
        var config = NewConfig(id: existingId, profileId: profileId);
        config.PromptText = new string('x', 32_769);
        _repository.GetByIdAsync(existingId, Arg.Any<CancellationToken>())
            .Returns(NewConfig(profileId: profileId));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            _sut.UpdateAsync(config, Guid.NewGuid()));
    }

    // -------------------------------------------------------------------------
    // DeleteAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task DeleteAsync_DelegatesToRepositoryDeleteAsync()
    {
        var id = Guid.NewGuid();

        await _sut.DeleteAsync(id);

        await _repository.Received(1).DeleteAsync(id, Arg.Any<CancellationToken>());
    }

    // -------------------------------------------------------------------------
    // SetActiveAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task SetActiveAsync_CallsRepositorySetActiveAsync()
    {
        var id = Guid.NewGuid();

        await _sut.SetActiveAsync(id);

        await _repository.Received(1).SetActiveAsync(id, Arg.Any<CancellationToken>());
    }


    // -------------------------------------------------------------------------
    // Saved/Deleted notifications (006 research R10, data-model §2–3)
    // -------------------------------------------------------------------------

    private static AIEvaluatorConfig Row(Guid id, bool isActive, string alias = "blogPost", int version = 1)
        => new()
        {
            Id = id,
            Name = "Row " + id.ToString()[..4],
            DocumentTypeAlias = alias,
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            IsActive = isActive,
            Version = version,
            DateModified = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc),
        };

    /// <summary>The document type's rows before, then after, the repository call.</summary>
    private void GivenRows(string alias, IReadOnlyList<AIEvaluatorConfig> before, IReadOnlyList<AIEvaluatorConfig> after)
        => _repository.GetByDocumentTypeAliasAsync(alias, Arg.Any<CancellationToken>()).Returns(before, after);

    private List<object> Published() => _eventAggregator.ReceivedCalls()
        .Where(c => c.GetMethodInfo().Name == nameof(IEventAggregator.PublishAsync))
        .Select(c => c.GetArguments()[0]!)
        .ToList();

    private List<Guid> SavedIds() => Published().OfType<EvaluatorConfigSavedNotification>().Select(n => n.Entity.Id).ToList();

    private List<Guid> DeletedIds() => Published().OfType<EvaluatorConfigDeletedNotification>().Select(n => n.EntityId).ToList();

    [Fact]
    public async Task CreateAsync_PublishesSavedForTheNewRow_AndForEachSiblingItDeactivated()
    {
        var profileId = Guid.NewGuid();
        MockProfileExists(profileId);
        Guid active = Guid.NewGuid(), inactive = Guid.NewGuid();
        var config = NewConfig(profileId: profileId);
        _repository.SaveAsync(config, Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _repository.GetByDocumentTypeAliasAsync("blogPost", Arg.Any<CancellationToken>()).Returns(
            _ => [Row(active, true), Row(inactive, false)],
            _ => [Row(config.Id, true), Row(active, false), Row(inactive, false)]);

        await _sut.CreateAsync(config, Guid.NewGuid());

        Assert.Equal([config.Id, active], SavedIds());
        Assert.Empty(DeletedIds());
        var savedNew = Published().OfType<EvaluatorConfigSavedNotification>().First();
        Assert.True(savedNew.Entity.IsActive);
        Assert.NotNull(savedNew.Messages);
    }

    [Fact]
    public async Task UpdateAsync_PublishesSavedForTheRow()
    {
        var id = Guid.NewGuid();
        var sibling = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(ExistingConfig(id: id, profileId: profileId));
        MockProfileExists(profileId);
        GivenRows("blogPost",
            [Row(id, true, version: 1), Row(sibling, false)],
            [Row(id, true, version: 2), Row(sibling, false)]);

        var updated = NewConfig(id: id, profileId: profileId);
        updated.Version = 1;
        await _sut.UpdateAsync(updated, Guid.NewGuid());

        Assert.Equal([id], SavedIds());
        Assert.Equal(2, Published().OfType<EvaluatorConfigSavedNotification>().Single().Entity.Version);
    }

    [Fact]
    public async Task UpdateAsync_ThatMovesTheRowToAnotherDocumentType_PublishesTheSiblingsItDeactivatedThere()
    {
        var id = Guid.NewGuid();
        var target = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(ExistingConfig(id: id, profileId: profileId));
        MockProfileExists(profileId);
        GivenRows("blogPost", [Row(id, true)], []);
        GivenRows("newsPage", [Row(target, true, "newsPage")], [Row(id, true, "newsPage", 2), Row(target, false, "newsPage")]);

        var updated = NewConfig(id: id, profileId: profileId, documentTypeAlias: "newsPage");
        updated.Version = 1;
        await _sut.UpdateAsync(updated, Guid.NewGuid());

        Assert.Equal([id, target], SavedIds());
        Assert.Empty(DeletedIds());
    }

    [Fact]
    public async Task SetActiveAsync_PublishesTheRowAndTheDeactivatedSiblings()
    {
        Guid id = Guid.NewGuid(), previouslyActive = Guid.NewGuid(), untouched = Guid.NewGuid();
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(Row(id, false));
        GivenRows("blogPost",
            [Row(id, false), Row(previouslyActive, true), Row(untouched, false)],
            [Row(id, true), Row(previouslyActive, false), Row(untouched, false)]);

        await _sut.SetActiveAsync(id);

        Assert.Equal([id, previouslyActive], SavedIds());
    }

    [Fact]
    public async Task SetActiveAsync_OnTheActiveRow_PublishesNothing()
    {
        Guid id = Guid.NewGuid(), sibling = Guid.NewGuid();
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(Row(id, true));
        GivenRows("blogPost", [Row(id, true), Row(sibling, false)], [Row(id, true), Row(sibling, false)]);

        await _sut.SetActiveAsync(id);

        Assert.Empty(Published());
    }

    [Fact]
    public async Task DeleteAsync_PublishesDeletedForTheRow_AndSavedForThePromotedSibling()
    {
        Guid id = Guid.NewGuid(), promoted = Guid.NewGuid(), other = Guid.NewGuid();
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(Row(id, true));
        GivenRows("blogPost",
            [Row(id, true), Row(promoted, false), Row(other, false)],
            [Row(promoted, true), Row(other, false)]);

        await _sut.DeleteAsync(id);

        Assert.Equal([id], DeletedIds());
        Assert.Equal([promoted], SavedIds());
        await _repository.Received(1).DeleteAsync(id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAsync_ForAMissingRow_PublishesNothing()
    {
        _repository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((AIEvaluatorConfig?)null);

        await _sut.DeleteAsync(Guid.NewGuid());

        Assert.Empty(Published());
    }

    [Fact]
    public async Task AHandlerException_NeverPropagates_AndIsLogged()
    {
        Guid id = Guid.NewGuid(), promoted = Guid.NewGuid();
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(Row(id, true));
        GivenRows("blogPost", [Row(id, true), Row(promoted, false)], [Row(promoted, true)]);
        _eventAggregator.PublishAsync(Arg.Any<EvaluatorConfigDeletedNotification>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("handler failed"));

        await _sut.DeleteAsync(id); // must not throw: the delete is already committed

        await _repository.Received(1).DeleteAsync(id, Arg.Any<CancellationToken>());
        Assert.Equal([promoted], SavedIds()); // a failing handler doesn't stop the other notifications
        Assert.Contains(_logger.ReceivedCalls(), c =>
            c.GetMethodInfo().Name == nameof(ILogger.Log)
            && (LogLevel)c.GetArguments()[0]! >= LogLevel.Warning
            && c.GetArguments()[3] is InvalidOperationException);
    }

    [Fact]
    public async Task NotificationsArePublishedAfterTheRepositoryCall()
    {
        var id = Guid.NewGuid();
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(Row(id, false));
        GivenRows("blogPost", [Row(id, false)], [Row(id, true)]);
        bool committed = false;
        _repository.SetActiveAsync(id, Arg.Any<CancellationToken>()).Returns(_ => { committed = true; return Task.CompletedTask; });
        bool publishedAfterCommit = false;
        _eventAggregator.PublishAsync(Arg.Any<EvaluatorConfigSavedNotification>(), Arg.Any<CancellationToken>())
            .Returns(_ => { publishedAfterCommit = committed; return Task.CompletedTask; });

        await _sut.SetActiveAsync(id);

        Assert.True(publishedAfterCommit);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void MockProfileExists(Guid profileId)
    {
        _profileService.GetProfileAsync(profileId, Arg.Any<CancellationToken>())
            .Returns(new AIProfile
            {
                Alias = "test-profile",
                Name = "Test Profile",
                ConnectionId = Guid.Empty,
            });
    }

    private static AIEvaluatorConfig NewConfig(
        Guid? id = null,
        string name = "Test Evaluator",
        string documentTypeAlias = "blogPost",
        Guid? profileId = null,
        Guid? contextId = null,
        string promptText = "Evaluate this page.")
        => new()
        {
            Id = id ?? Guid.Empty,
            Name = name,
            DocumentTypeAlias = documentTypeAlias,
            ProfileId = profileId ?? Guid.NewGuid(),
            ContextId = contextId,
            PromptText = promptText,
        };

    private static AIEvaluatorConfig ExistingConfig(
        Guid? id = null,
        Guid? profileId = null,
        DateTime? dateCreated = null,
        bool isActive = true)
        => new()
        {
            Id = id ?? Guid.NewGuid(),
            Name = "Existing Evaluator",
            DocumentTypeAlias = "blogPost",
            ProfileId = profileId ?? Guid.NewGuid(),
            PromptText = "Evaluate this page.",
            IsActive = isActive,
            DateCreated = dateCreated ?? DateTime.UtcNow,
            DateModified = DateTime.UtcNow,
        };
}
