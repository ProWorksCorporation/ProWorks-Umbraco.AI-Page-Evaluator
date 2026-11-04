using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Deploy.Artifacts;
using ProWorks.Umbraco.AI.PageEvaluator.Deploy.Connectors;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using Umbraco.AI.Core.Profiles;
using Umbraco.AI.Deploy.Configuration;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Deploy;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Deploy.Core.Connectors.ServiceConnectors;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy.Tests;

/// <summary>
/// <see cref="EvaluatorConfigServiceConnector"/> (006 contracts/deploy-artifact.md §2.3–2.4). The connector is a
/// singleton, so it resolves the scoped config and import services through a DI scope; the tests register substitutes
/// in a real <see cref="ServiceCollection"/>.
/// </summary>
public class EvaluatorConfigServiceConnectorTests
{
    private const string EntityType = "proworks-ai-evaluator-config";

    private readonly IEvaluatorConfigImportService _importService = Substitute.For<IEvaluatorConfigImportService>();
    private readonly IAIEvaluatorConfigService _configService = Substitute.For<IAIEvaluatorConfigService>();
    private readonly IAIProfileService _profileService = Substitute.For<IAIProfileService>();
    private readonly IContentTypeService _contentTypeService = Substitute.For<IContentTypeService>();
    private readonly ILogger<EvaluatorConfigServiceConnector> _logger = Substitute.For<ILogger<EvaluatorConfigServiceConnector>>();
    private readonly IDeployContext _context = Substitute.For<IDeployContext>();
    private readonly EvaluatorConfigServiceConnector _connector;

    public EvaluatorConfigServiceConnectorTests()
    {
        var settingsAccessor = Substitute.For<UmbracoAIDeploySettingsAccessor>(new object?[] { null });
        settingsAccessor.Settings.Returns(new UmbracoAIDeploySettings());

        var services = new ServiceCollection();
        services.AddScoped(_ => _importService);
        services.AddScoped(_ => _configService);
        IServiceScopeFactory scopeFactory = services.BuildServiceProvider(validateScopes: true).GetRequiredService<IServiceScopeFactory>();

        _connector = new EvaluatorConfigServiceConnector(
            scopeFactory, _contentTypeService, _profileService, settingsAccessor, _logger);
    }

    private static AIEvaluatorConfig Config(Guid? id = null, Guid? contextId = null, bool isActive = true) => new()
    {
        Id = id ?? Guid.NewGuid(),
        Name = "Blog checks",
        Description = "Checks blog posts.",
        DocumentTypeAlias = "blogPost",
        ProfileId = Guid.NewGuid(),
        ContextId = contextId,
        PromptText = "Check the post.",
        PropertyAliases = ["title", "body"],
        ScoringEnabled = true,
        RecommendationsEnabled = false,
        IsActive = isActive,
        Version = 7,
        DateCreated = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        DateModified = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc),
        CreatedByUserId = Guid.NewGuid(),
        ModifiedByUserId = Guid.NewGuid(),
        IsDeployManaged = true,
    };

    private static GuidUdi Udi(Guid id) => new(EntityType, id);

    private static EvaluatorConfigArtifact Artifact(Guid id, Guid profileId, Guid? contextId = null, bool isActive = true, string name = "Blog checks") => new(Udi(id))
    {
        Name = name,
        Alias = "blogPost",
        DocumentTypeAlias = "blogPost",
        Description = "Checks blog posts.",
        ProfileUdi = new GuidUdi("umbraco-ai-profile", profileId),
        ContextUdi = contextId is Guid c ? new GuidUdi("umbraco-ai-context", c) : null,
        PromptText = "Check the post.",
        PropertyAliases = ["title", "body"],
        ScoringEnabled = true,
        RecommendationsEnabled = false,
        IsActive = isActive,
    };

    private void GivenProfile(Guid profileId)
        => _profileService.GetProfileAsync(profileId, Arg.Any<CancellationToken>())
            .Returns(new AIProfile(profileId) { Alias = "p", Name = "Profile", ConnectionId = Guid.Empty });

    private void GivenDocumentType(string alias)
        => _contentTypeService.Get(alias).Returns(Substitute.For<IContentType>());

    private void AssertLogged(LogLevel level, Func<string, bool> message)
        => _logger.Received().Log(level, Arg.Any<EventId>(), Arg.Is<object>(v => message(v.ToString()!)),
            Arg.Any<Exception?>(), Arg.Any<Func<object, Exception?, string>>());

    // -------------------------------------------------------------------------
    // Identity
    // -------------------------------------------------------------------------

    [Fact]
    public void UdiEntityType_AndUdiDefinition_UseTheEvaluatorConfigType()
    {
        Assert.Equal(EntityType, _connector.UdiEntityType);
        Assert.Equal(EntityType, PageEvaluatorDeployConstants.UdiEntityType.EvaluatorConfig);

        UdiDefinitionAttribute definition = Assert.Single(typeof(EvaluatorConfigServiceConnector).GetCustomAttributes<UdiDefinitionAttribute>());
        Assert.Equal(EntityType, definition.EntityType);
        Assert.Equal(UdiType.GuidUdi, definition.UdiType);
    }

    [Fact]
    public void Connector_IsDeletable()
        => Assert.IsAssignableFrom<IDeletableServiceConnector>(_connector);

    [Fact]
    public void GetEntityName_IsTheNameAndDocumentType()
        => Assert.Equal("Blog checks (blogPost)", _connector.GetEntityName(Config()));

    [Fact]
    public async Task GetEntityAsync_AndGetEntitiesAsync_UseTheConfigService()
    {
        AIEvaluatorConfig one = Config(), two = Config();
        _configService.GetByIdAsync(one.Id, Arg.Any<CancellationToken>()).Returns(one);
        _configService.GetAllAsync(Arg.Any<CancellationToken>()).Returns([one, two]);

        Assert.Same(one, await _connector.GetEntityAsync(one.Id));
        var all = new List<AIEvaluatorConfig>();
        await foreach (AIEvaluatorConfig config in _connector.GetEntitiesAsync())
            all.Add(config);
        Assert.Equal([one.Id, two.Id], all.Select(c => c.Id));
    }

    // -------------------------------------------------------------------------
    // GetArtifactAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetArtifactAsync_MapsEveryDeployableField()
    {
        var contextId = Guid.NewGuid();
        AIEvaluatorConfig config = Config(contextId: contextId, isActive: false);

        EvaluatorConfigArtifact? artifact = await _connector.GetArtifactAsync(Udi(config.Id), config);

        Assert.NotNull(artifact);
        Assert.Equal(Udi(config.Id), artifact.Udi);
        Assert.Equal("Blog checks", artifact.Name);
        Assert.Equal("blogPost", artifact.Alias);
        Assert.Equal("blogPost", artifact.DocumentTypeAlias);
        Assert.Equal("Checks blog posts.", artifact.Description);
        Assert.Equal(new GuidUdi("umbraco-ai-profile", config.ProfileId), artifact.ProfileUdi);
        Assert.Equal(new GuidUdi("umbraco-ai-context", contextId), artifact.ContextUdi);
        Assert.Equal("Check the post.", artifact.PromptText);
        Assert.Equal(["title", "body"], artifact.PropertyAliases);
        Assert.True(artifact.ScoringEnabled);
        Assert.False(artifact.RecommendationsEnabled);
        Assert.False(artifact.IsActive);
    }

    [Fact]
    public async Task GetArtifactAsync_AddsAProfileMatchDependency_AndAContextMatchDependencyWhenSet()
    {
        var contextId = Guid.NewGuid();
        AIEvaluatorConfig config = Config(contextId: contextId);

        EvaluatorConfigArtifact artifact = (await _connector.GetArtifactAsync(Udi(config.Id), config))!;

        ArtifactDependency profile = Assert.Single(artifact.Dependencies, d => d.Udi.EntityType == "umbraco-ai-profile");
        Assert.Equal(config.ProfileId, ((GuidUdi)profile.Udi).Guid);
        Assert.Equal(ArtifactDependencyMode.Match, profile.Mode);
        ArtifactDependency context = Assert.Single(artifact.Dependencies, d => d.Udi.EntityType == "umbraco-ai-context");
        Assert.Equal(contextId, ((GuidUdi)context.Udi).Guid);
        Assert.Equal(ArtifactDependencyMode.Match, context.Mode);
        Assert.Equal(2, artifact.Dependencies.Count());
    }

    [Fact]
    public async Task GetArtifactAsync_WithoutAContext_HasOnlyTheProfileDependency()
    {
        AIEvaluatorConfig config = Config(contextId: null);

        EvaluatorConfigArtifact artifact = (await _connector.GetArtifactAsync(Udi(config.Id), config))!;

        Assert.Null(artifact.ContextUdi);
        Assert.Equal("umbraco-ai-profile", Assert.Single(artifact.Dependencies).Udi.EntityType);
    }

    [Fact]
    public void Artifact_HasNoRecordFields()
    {
        // Spec FR-034: Version, dates, users and IsDeployManaged never travel with the artifact.
        string[] properties = typeof(EvaluatorConfigArtifact).GetProperties().Select(p => p.Name).ToArray();
        foreach (string excluded in new[] { "Version", "DateCreated", "DateModified", "CreatedByUserId", "ModifiedByUserId", "IsDeployManaged", "ProfileId", "ContextId" })
            Assert.DoesNotContain(excluded, properties);
    }

    [Fact]
    public async Task GetArtifactAsync_NullEntity_ReturnsNull()
        => Assert.Null(await _connector.GetArtifactAsync(Udi(Guid.NewGuid()), (AIEvaluatorConfig?)null));

    [Fact]
    public async Task GetArtifactAsync_NeverThrows_WhenTheProfileNoLongerExists()
    {
        // CleanSchema builds an artifact for every target entity, including configs whose profile was deleted.
        _profileService.GetProfileAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).ThrowsAsync(new InvalidOperationException("gone"));
        AIEvaluatorConfig config = Config();

        EvaluatorConfigArtifact? artifact = await _connector.GetArtifactAsync(Udi(config.Id), config);

        Assert.NotNull(artifact);
        Assert.Equal(config.ProfileId, artifact.ProfileUdi.Guid);
    }

    // -------------------------------------------------------------------------
    // ProcessInitAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ProcessInitAsync_IdMatch_UsesTheExistingConfig_WithoutLookingForCandidates()
    {
        AIEvaluatorConfig existing = Config();
        _configService.GetByIdAsync(existing.Id, Arg.Any<CancellationToken>()).Returns(existing);

        ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig> state =
            await _connector.ProcessInitAsync(Artifact(existing.Id, existing.ProfileId), _context);

        Assert.Same(existing, state.Entity);
        await _importService.DidNotReceive().FindAdoptionCandidatesAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _importService.DidNotReceive().AdoptAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ProcessInitAsync_OneCandidate_IsAdoptedUnderTheArtifactId()
    {
        var artifactId = Guid.NewGuid();
        AIEvaluatorConfig candidate = Config();
        AIEvaluatorConfig adopted = Config(id: artifactId);
        _importService.FindAdoptionCandidatesAsync("blogPost", "Blog checks", Arg.Any<CancellationToken>()).Returns([candidate]);
        _importService.AdoptAsync(candidate.Id, artifactId, Arg.Any<CancellationToken>()).Returns(adopted);

        ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig> state =
            await _connector.ProcessInitAsync(Artifact(artifactId, Guid.NewGuid()), _context);

        Assert.Same(adopted, state.Entity);
        await _importService.Received(1).AdoptAsync(candidate.Id, artifactId, Arg.Any<CancellationToken>());
        AssertLogged(LogLevel.Information, m => m.Contains("adopted", StringComparison.OrdinalIgnoreCase) && m.Contains(candidate.Id.ToString()));
    }

    [Fact]
    public async Task ProcessInitAsync_SeveralCandidates_LogsAWarning_AndCreatesANewConfig()
    {
        var artifactId = Guid.NewGuid();
        AIEvaluatorConfig first = Config(), second = Config();
        _importService.FindAdoptionCandidatesAsync("blogPost", "Blog checks", Arg.Any<CancellationToken>()).Returns([first, second]);

        ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig> state =
            await _connector.ProcessInitAsync(Artifact(artifactId, Guid.NewGuid()), _context);

        Assert.Null(state.Entity);
        await _importService.DidNotReceive().AdoptAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        AssertLogged(LogLevel.Warning, m => m.Contains("blogPost") && m.Contains("Blog checks")
            && m.Contains(first.Id.ToString()) && m.Contains(second.Id.ToString()));
    }

    [Fact]
    public async Task ProcessInitAsync_NoCandidate_CreatesANewConfig()
    {
        _importService.FindAdoptionCandidatesAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns([]);

        ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig> state =
            await _connector.ProcessInitAsync(Artifact(Guid.NewGuid(), Guid.NewGuid()), _context);

        Assert.Null(state.Entity);
        await _importService.DidNotReceive().AdoptAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ProcessInitAsync_SchedulesPass3_AfterConnectionsProfilesAndContexts()
    {
        // Spec FR-035: Umbraco.AI processes connections in pass 1, profiles in pass 2, contexts in pass 2 or 3.
        _importService.FindAdoptionCandidatesAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns([]);

        ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig> state =
            await _connector.ProcessInitAsync(Artifact(Guid.NewGuid(), Guid.NewGuid()), _context);

        Assert.Equal(3, state.NextPass);
    }

    // -------------------------------------------------------------------------
    // ProcessAsync (pass 3)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ProcessAsync_Pass3_MapsTheArtifactWithTheUdiGuid_AndImportsIt()
    {
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var contextId = Guid.NewGuid();
        GivenProfile(profileId);
        GivenDocumentType("blogPost");
        AIEvaluatorConfig imported = Config(id: id);
        AIEvaluatorConfig? sent = null;
        _importService.ImportAsync(Arg.Do<AIEvaluatorConfig>(c => sent = c), Arg.Any<CancellationToken>()).Returns(imported);
        var state = new ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig>(
            Artifact(id, profileId, contextId, isActive: false), null, _connector, 3);

        await _connector.ProcessAsync(state, _context, 3);

        Assert.NotNull(sent);
        Assert.Equal(id, sent.Id);
        Assert.Equal("Blog checks", sent.Name);
        Assert.Equal("Checks blog posts.", sent.Description);
        Assert.Equal("blogPost", sent.DocumentTypeAlias);
        Assert.Equal(profileId, sent.ProfileId);
        Assert.Equal(contextId, sent.ContextId);
        Assert.Equal("Check the post.", sent.PromptText);
        Assert.Equal(["title", "body"], sent.PropertyAliases);
        Assert.True(sent.ScoringEnabled);
        Assert.False(sent.RecommendationsEnabled);
        Assert.False(sent.IsActive);
        Assert.Same(imported, state.Entity);
    }

    [Fact]
    public async Task ProcessAsync_Pass3_UpdatesAnExistingEntityThroughImportToo()
    {
        var profileId = Guid.NewGuid();
        GivenProfile(profileId);
        GivenDocumentType("blogPost");
        AIEvaluatorConfig existing = Config();
        _importService.ImportAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<CancellationToken>()).Returns(existing);
        var state = new ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig>(
            Artifact(existing.Id, profileId), existing, _connector, 3);

        await _connector.ProcessAsync(state, _context, 3);

        await _importService.Received(1).ImportAsync(Arg.Is<AIEvaluatorConfig>(c => c.Id == existing.Id && c.IsActive), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ProcessAsync_Pass3_MissingProfile_Throws_AndImportsNothing()
    {
        _profileService.GetProfileAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((AIProfile?)null);
        var state = new ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig>(
            Artifact(Guid.NewGuid(), Guid.NewGuid()), null, _connector, 3);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _connector.ProcessAsync(state, _context, 3));

        await _importService.DidNotReceive().ImportAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ProcessAsync_Pass3_MissingDocumentType_LogsAWarning_AndStillImports()
    {
        var profileId = Guid.NewGuid();
        GivenProfile(profileId);
        _contentTypeService.Get("blogPost").Returns((IContentType?)null);
        _importService.ImportAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<CancellationToken>()).Returns(c => c.Arg<AIEvaluatorConfig>());
        var state = new ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig>(
            Artifact(Guid.NewGuid(), profileId), null, _connector, 3);

        await _connector.ProcessAsync(state, _context, 3);

        await _importService.Received(1).ImportAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<CancellationToken>());
        AssertLogged(LogLevel.Warning, m => m.Contains("blogPost"));
    }

    // -------------------------------------------------------------------------
    // IDeletableServiceConnector
    // -------------------------------------------------------------------------

    [Fact]
    public async Task DeleteAsync_Udi_DeletesADeployManagedConfig()
    {
        var id = Guid.NewGuid();
        _importService.DeleteManagedAsync(id, Arg.Any<CancellationToken>()).Returns(true);

        await ((IDeletableServiceConnector)_connector).DeleteAsync(Udi(id), _context);

        await _importService.Received(1).DeleteManagedAsync(id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAsync_Udi_HandMadeConfig_IsSkippedWithAnInformationLog()
    {
        var id = Guid.NewGuid();
        _importService.DeleteManagedAsync(id, Arg.Any<CancellationToken>()).Returns(false);

        await ((IDeletableServiceConnector)_connector).DeleteAsync(Udi(id), _context);

        AssertLogged(LogLevel.Information, m => m.Contains(id.ToString()));
    }

    [Fact]
    public async Task DeleteAsync_Udi_OfAnotherEntityType_Throws()
    {
        // Deploy's own EnsureType (as in DeletableServiceConnectorBase) throws a plain Exception("Unexpected entity type …").
        Exception thrown = await Assert.ThrowsAnyAsync<Exception>(() =>
            ((IDeletableServiceConnector)_connector).DeleteAsync(new GuidUdi("document", Guid.NewGuid()), _context));
        Assert.Contains("document", thrown.Message);

        await _importService.DidNotReceive().DeleteManagedAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAsync_Entity_DeletesADeployManagedConfig()
    {
        AIEvaluatorConfig config = Config();
        _importService.DeleteManagedAsync(config.Id, Arg.Any<CancellationToken>()).Returns(true);

        await ((IDeletableServiceConnector)_connector).DeleteAsync(config, _context);

        await _importService.Received(1).DeleteManagedAsync(config.Id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAsync_Entity_HandMadeConfig_IsSkippedWithAnInformationLog()
    {
        AIEvaluatorConfig config = Config();
        _importService.DeleteManagedAsync(config.Id, Arg.Any<CancellationToken>()).Returns(false);

        await ((IDeletableServiceConnector)_connector).DeleteAsync(config, _context);

        AssertLogged(LogLevel.Information, m => m.Contains(config.Id.ToString()));
    }

    [Fact]
    public async Task DeleteAsync_Entity_OfAnotherType_ThrowsArgumentException()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            ((IDeletableServiceConnector)_connector).DeleteAsync(new object(), _context));

        await _importService.DidNotReceive().DeleteManagedAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }
}
