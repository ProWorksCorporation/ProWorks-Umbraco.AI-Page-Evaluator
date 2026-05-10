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
}
