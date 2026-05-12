using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Evaluators;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Persistence;

public class AIEvaluatorConfigEntityFactoryTests
{
    private static AIEvaluatorConfigEntity BuildEntity(bool scoringEnabled) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate this page.",
            ScoringEnabled = scoringEnabled,
            Version = 1,
        };

    private static AIEvaluatorConfig BuildDomain(bool scoringEnabled) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate this page.",
            ScoringEnabled = scoringEnabled,
            Version = 1,
        };

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ToDomain_CarriesScoringEnabled(bool scoringEnabled)
    {
        var entity = BuildEntity(scoringEnabled);
        var domain = AIEvaluatorConfigEntityFactory.ToDomain(entity);
        Assert.Equal(scoringEnabled, domain.ScoringEnabled);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ToEntity_CarriesScoringEnabled(bool scoringEnabled)
    {
        var domain = BuildDomain(scoringEnabled);
        var entity = AIEvaluatorConfigEntityFactory.ToEntity(domain);
        Assert.Equal(scoringEnabled, entity.ScoringEnabled);
    }

    [Fact]
    public void ApplyToEntity_UpdatesScoringEnabled_FromFalseToTrue()
    {
        var entity = BuildEntity(scoringEnabled: false);
        var domain = BuildDomain(scoringEnabled: true);

        AIEvaluatorConfigEntityFactory.ApplyToEntity(domain, entity);

        Assert.True(entity.ScoringEnabled);
    }

    [Fact]
    public void ApplyToEntity_UpdatesScoringEnabled_FromTrueToFalse()
    {
        var entity = BuildEntity(scoringEnabled: true);
        var domain = BuildDomain(scoringEnabled: false);

        AIEvaluatorConfigEntityFactory.ApplyToEntity(domain, entity);

        Assert.False(entity.ScoringEnabled);
    }

    [Fact]
    public void ApplyToEntity_IncrementsVersionByOne()
    {
        var entity = BuildEntity(scoringEnabled: false);   // Version = 1
        var domain = BuildDomain(scoringEnabled: false);   // Version = 1

        AIEvaluatorConfigEntityFactory.ApplyToEntity(domain, entity);

        Assert.Equal(2, entity.Version);  // domain.Version (1) + 1 = 2
    }

    [Fact]
    public void ApplyToEntity_VersionIsAlwaysDomainVersionPlusOne()
    {
        var entity = BuildEntity(scoringEnabled: false);
        entity.Version = 5;

        var domain = new AIEvaluatorConfig
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate this page.",
            ScoringEnabled = false,
            Version = 7,
        };

        AIEvaluatorConfigEntityFactory.ApplyToEntity(domain, entity);

        Assert.Equal(8, entity.Version);  // domain.Version (7) + 1 = 8
    }

    // ---------------------------------------------------------------------------
    // PropertyAliases serialization round-trip
    // ---------------------------------------------------------------------------

    [Fact]
    public void ToEntity_SerializesPropertyAliasesToJson()
    {
        var domain = new AIEvaluatorConfig
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            PropertyAliases = ["title", "bodyText"],
        };

        var entity = AIEvaluatorConfigEntityFactory.ToEntity(domain);

        Assert.Equal("""["title","bodyText"]""", entity.PropertyAliases);
    }

    [Fact]
    public void ToEntity_WhenPropertyAliasesIsEmpty_StoresNull()
    {
        var domain = new AIEvaluatorConfig
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            PropertyAliases = [],
        };

        var entity = AIEvaluatorConfigEntityFactory.ToEntity(domain);

        Assert.Null(entity.PropertyAliases);
    }

    [Fact]
    public void ToEntity_WhenPropertyAliasesIsNull_StoresNull()
    {
        var domain = new AIEvaluatorConfig
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            PropertyAliases = null,
        };

        var entity = AIEvaluatorConfigEntityFactory.ToEntity(domain);

        Assert.Null(entity.PropertyAliases);
    }

    [Fact]
    public void ToDomain_DeserializesPropertyAliasesFromJson()
    {
        var entity = new AIEvaluatorConfigEntity
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            PropertyAliases = """["alpha","beta"]""",
        };

        var domain = AIEvaluatorConfigEntityFactory.ToDomain(entity);

        Assert.NotNull(domain.PropertyAliases);
        Assert.Equal(2, domain.PropertyAliases!.Count);
        Assert.Equal("alpha", domain.PropertyAliases[0]);
        Assert.Equal("beta", domain.PropertyAliases[1]);
    }

    [Fact]
    public void ToDomain_WhenPropertyAliasesIsNull_ReturnsNull()
    {
        var entity = new AIEvaluatorConfigEntity
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            PropertyAliases = null,
        };

        var domain = AIEvaluatorConfigEntityFactory.ToDomain(entity);

        Assert.Null(domain.PropertyAliases);
    }

    [Fact]
    public void ToDomain_WhenPropertyAliasesJsonIsMalformed_ReturnsNull()
    {
        var entity = new AIEvaluatorConfigEntity
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            PropertyAliases = "not-valid-json!!!",
        };

        var domain = AIEvaluatorConfigEntityFactory.ToDomain(entity);

        Assert.Null(domain.PropertyAliases);
    }

    // ---------------------------------------------------------------------------
    // GuardrailIds serialization round-trip
    // ---------------------------------------------------------------------------

    [Fact]
    public void ToDomain_WhenEntityHasGuardrailIds_DeserializesCorrectly()
    {
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var entity = BuildEntity(scoringEnabled: false);
        entity.GuardrailIds = $"[\"{id1}\",\"{id2}\"]";

        var domain = AIEvaluatorConfigEntityFactory.ToDomain(entity);

        Assert.NotNull(domain.GuardrailIds);
        Assert.Equal(2, domain.GuardrailIds!.Count);
        Assert.Contains(id1, domain.GuardrailIds);
        Assert.Contains(id2, domain.GuardrailIds);
    }

    [Fact]
    public void ToDomain_WhenEntityHasNullGuardrailIds_ReturnsNull()
    {
        var entity = BuildEntity(scoringEnabled: false);
        entity.GuardrailIds = null;

        var domain = AIEvaluatorConfigEntityFactory.ToDomain(entity);

        Assert.Null(domain.GuardrailIds);
    }

    [Fact]
    public void ToEntity_WhenDomainHasGuardrailIds_SerializesCorrectly()
    {
        var id1 = Guid.NewGuid();
        var domain = BuildDomain(scoringEnabled: false);
        domain.GuardrailIds = [id1];

        var entity = AIEvaluatorConfigEntityFactory.ToEntity(domain);

        Assert.NotNull(entity.GuardrailIds);
        Assert.Contains(id1.ToString(), entity.GuardrailIds!);
    }

    [Fact]
    public void ToEntity_WhenDomainHasNullGuardrailIds_SerializesNull()
    {
        var domain = BuildDomain(scoringEnabled: false);
        domain.GuardrailIds = null;

        var entity = AIEvaluatorConfigEntityFactory.ToEntity(domain);

        Assert.Null(entity.GuardrailIds);
    }

    [Fact]
    public void ApplyToEntity_UpdatesGuardrailIds()
    {
        var id1 = Guid.NewGuid();
        var entity = BuildEntity(scoringEnabled: false);
        var domain = BuildDomain(scoringEnabled: false);
        domain.GuardrailIds = [id1];

        AIEvaluatorConfigEntityFactory.ApplyToEntity(domain, entity);

        Assert.NotNull(entity.GuardrailIds);
        Assert.Contains(id1.ToString(), entity.GuardrailIds!);
    }
}
