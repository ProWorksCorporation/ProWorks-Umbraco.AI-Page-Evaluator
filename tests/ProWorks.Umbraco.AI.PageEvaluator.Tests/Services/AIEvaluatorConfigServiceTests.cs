using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
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
    private readonly AIEvaluatorConfigService _sut;

    public AIEvaluatorConfigServiceTests()
    {
        // T046: constructor must accept (repository, profileService, contextService).
        // Currently accepts only (repository) — this line triggers the RED compile error.
        _sut = new AIEvaluatorConfigService(_repository, _profileService, _contextService);
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
        var result = await _sut.UpdateAsync(updated, Guid.NewGuid());

        Assert.Equal(originalDate, result.DateCreated);
    }

    [Fact]
    public async Task UpdateAsync_SetsIsActiveTrueOnReturnedConfig()
    {
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var existing = ExistingConfig(id: id, profileId: profileId);
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        MockProfileExists(profileId);

        var updated = NewConfig(id: id, profileId: profileId);
        var result = await _sut.UpdateAsync(updated, Guid.NewGuid());

        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task UpdateAsync_PreservesClientSuppliedVersion()
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

        Assert.Equal(5, result.Version);
    }

    [Fact]
    public async Task UpdateAsync_FallsBackToExistingVersion_WhenVersionIsZero()
    {
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var existing = ExistingConfig(id: id, profileId: profileId);
        existing.Version = 3;
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        MockProfileExists(profileId);

        var updated = NewConfig(id: id, profileId: profileId);
        updated.Version = 0; // client didn't supply version
        var result = await _sut.UpdateAsync(updated, Guid.NewGuid());

        Assert.Equal(3, result.Version);
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
        DateTime? dateCreated = null)
        => new()
        {
            Id = id ?? Guid.NewGuid(),
            Name = "Existing Evaluator",
            DocumentTypeAlias = "blogPost",
            ProfileId = profileId ?? Guid.NewGuid(),
            PromptText = "Evaluate this page.",
            IsActive = true,
            DateCreated = dateCreated ?? DateTime.UtcNow,
            DateModified = DateTime.UtcNow,
        };
}
