using System.Globalization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Primitives;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;
using Umbraco.Cms.Core.Services;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Tests;

/// <summary>
/// Text services for tests: the real <see cref="PageEvaluatorTextService"/> over the repository's
/// <c>wwwroot/lang/*.xml</c> (as served at <c>App_Plugins/ProWorks.AI.PageEvaluator/lang</c>), and a fake that
/// echoes <c>{language}:{key}</c> so tests can see which key and language were used.
/// </summary>
internal static class TestText
{
    public static IPageEvaluatorTextService Real()
    {
        var textService = Substitute.For<ILocalizedTextService>();
        textService.GetSupportedCultures().Returns(Array.Empty<CultureInfo>());

        var env = Substitute.For<IWebHostEnvironment>();
        env.WebRootFileProvider.Returns(new PrefixedFileProvider(
            "App_Plugins/ProWorks.AI.PageEvaluator/",
            new PhysicalFileProvider(WwwRoot())));

        return new PageEvaluatorTextService(textService, env);
    }

    public static string WwwRoot()
    {
        DirectoryInfo? dir = new(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "ProWorks.Umbraco.AI.PageEvaluator.sln")))
            dir = dir.Parent;

        return Path.Combine(dir!.FullName, "src", "ProWorks.Umbraco.AI.PageEvaluator", "wwwroot");
    }

    /// <summary>Echoes <c>{language}:{key}</c>, followed by <c>[name=value;…]</c> when tokens are given.</summary>
    public sealed class Echo : IPageEvaluatorTextService
    {
        public string Localize(string key, string language, IDictionary<string, string?>? tokens = null)
            => tokens is { Count: > 0 }
                ? $"{language}:{key}[{string.Join(";", tokens.Select(t => $"{t.Key}={t.Value}"))}]"
                : $"{language}:{key}";
    }

    private sealed class PrefixedFileProvider(string prefix, IFileProvider inner) : IFileProvider
    {
        public IFileInfo GetFileInfo(string subpath)
        {
            string path = subpath.TrimStart('/');
            return path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                ? inner.GetFileInfo(path[prefix.Length..])
                : new NotFoundFileInfo(subpath);
        }

        public IDirectoryContents GetDirectoryContents(string subpath) => NotFoundDirectoryContents.Singleton;

        public IChangeToken Watch(string filter) => NullChangeToken.Singleton;
    }
}
