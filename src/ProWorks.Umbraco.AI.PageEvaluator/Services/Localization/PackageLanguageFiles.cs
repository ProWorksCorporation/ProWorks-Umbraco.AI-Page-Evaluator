using System.Collections.Concurrent;
using System.Xml.Linq;
using Microsoft.Extensions.FileProviders;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;

/// <summary>
/// Reads the <c>proworksPageEvaluator</c> area of the package's own <c>{language}.xml</c> files, for languages CMS
/// doesn't load (see <see cref="PageEvaluatorTextService"/>). Each file is read once.
/// </summary>
internal sealed class PackageLanguageFiles
{
    private static readonly IReadOnlyDictionary<string, string> Empty = new Dictionary<string, string>();

    private readonly IFileProvider _fileProvider;
    private readonly string _folder;
    private readonly ConcurrentDictionary<string, IReadOnlyDictionary<string, string>> _files = new(StringComparer.Ordinal);

    public PackageLanguageFiles(IFileProvider fileProvider, string folder)
    {
        _fileProvider = fileProvider;
        _folder = folder.TrimEnd('/');
    }

    /// <summary>The value of <paramref name="key"/> in <paramref name="language"/>'s file, or <see langword="null"/>.</summary>
    public string? Get(string language, string key)
        => _files.GetOrAdd(language, Load).TryGetValue(key, out string? value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : null;

    private IReadOnlyDictionary<string, string> Load(string language)
    {
        IFileInfo file = _fileProvider.GetFileInfo($"{_folder}/{language}.xml");
        if (!file.Exists)
            return Empty;

        try
        {
            using Stream stream = file.CreateReadStream();
            XDocument doc = XDocument.Load(stream);
            var keys = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (XElement key in doc.Root?.Elements("area")
                         .Where(a => (string?)a.Attribute("alias") == PageEvaluatorTextService.Area)
                         .SelectMany(a => a.Elements("key")) ?? [])
            {
                if ((string?)key.Attribute("alias") is { Length: > 0 } alias)
                    keys[alias] = key.Value;
            }

            return keys;
        }
        catch (System.Xml.XmlException)
        {
            return Empty;
        }
    }
}
