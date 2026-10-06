// S5 geocode: offline trigram + prefix index over bundled names (research 7).
// Built offline by Sextant.Pack into `geocode.idx.json`; the App loads it and
// queries it in memory. Ranking (research 7 formula plus one exact-match
// point, so a full-name query always returns its own entry first):
//   score = 2*prefixBonus + exactBonus + overlap/len + classWeight + popWeight
// where prefixBonus = 1 when the folded name starts with the folded query,
// overlap/len is the trigram overlap fraction over the query trigrams,
// classWeight ranks Poi (0.5) above Street (0.3) above Place (0.2), and
// popWeight is the entry Pop field (packer-assigned, 0..0.5).
// Text folding: NFKD, strip NonSpacingMark, invariant-lowercase, collapse
// whitespace. Deterministic: ties break by folded name, then id.

using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Sextant.Core;

/// <summary>Feature kind for class weighting: POI beats street beats place.</summary>
public enum GeocodeKind : byte
{
    Poi = 0,
    Street = 1,
    Place = 2,
}

/// <summary>One named, searchable feature. Lon/Lat is the label anchor.</summary>
public sealed record GeocodeEntry(
    int Id,
    string Name,
    GeocodeKind Kind,
    string Class,
    double Lon,
    double Lat,
    double Pop);

/// <summary>NFKD folding + padded trigram helpers shared by index and tests.</summary>
public static class GeocodeText
{
    public static string Normalize(string s)
    {
        ArgumentNullException.ThrowIfNull(s);
        string folded = s.Normalize(NormalizationForm.FormKD);
        var sb = new StringBuilder(folded.Length);
        foreach (char c in folded)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                continue;
            sb.Append(char.ToLowerInvariant(c));
        }
        // Collapse ASCII whitespace runs to a single space and trim.
        var out_ = new StringBuilder(sb.Length);
        bool gap = true;
        for (int i = 0; i < sb.Length; i++)
        {
            char c = sb[i];
            bool space = c == ' ' || c == '\t' || c == '\n' || c == '\r';
            if (space)
            {
                if (!gap) { out_.Append(' '); gap = true; }
            }
            else
            {
                out_.Append(c);
                gap = false;
            }
        }
        if (out_.Length > 0 && out_[^1] == ' ')
            out_.Length--;
        return out_.ToString();
    }

    /// <summary>Padded character trigrams ("  ab  " for "ab"). Never empty for non-empty input.</summary>
    public static IReadOnlySet<string> Trigrams(string normalized)
    {
        ArgumentNullException.ThrowIfNull(normalized);
        string padded = "  " + normalized + "  ";
        var set = new HashSet<string>(StringComparer.Ordinal);
        for (int i = 0; i + 3 <= padded.Length; i++)
            set.Add(padded.Substring(i, 3));
        return set;
    }
}

/// <summary>
/// In-memory trigram inverted index plus prefix ranking. Top-8 default.
/// No IO, no wall-clock, no RNG: queries are pure functions of the entries.
/// </summary>
public sealed class GeocodeIndex
{
    public const string AssetVersion = "sextant-geocode/1";

    /// <summary>Maximum results per query (binding: top-8 autocomplete).</summary>
    public const int DefaultTopK = 8;

    private static readonly IReadOnlyDictionary<GeocodeKind, double> ClassWeights =
        new Dictionary<GeocodeKind, double>
        {
            [GeocodeKind.Poi] = 0.5,
            [GeocodeKind.Street] = 0.3,
            [GeocodeKind.Place] = 0.2,
        };

    private readonly List<GeocodeEntry> _entries;
    private readonly List<string> _folded;
    private readonly List<HashSet<string>> _tris;
    private readonly Dictionary<string, int[]> _inverted;

    private GeocodeIndex(List<GeocodeEntry> entries)
    {
        _entries = entries;
        _folded = new List<string>(entries.Count);
        _tris = new List<HashSet<string>>(entries.Count);
        var postings = new Dictionary<string, List<int>>(StringComparer.Ordinal);
        for (int i = 0; i < entries.Count; i++)
        {
            string folded = GeocodeText.Normalize(entries[i].Name);
            _folded.Add(folded);
            var tris = new HashSet<string>(GeocodeText.Trigrams(folded), StringComparer.Ordinal);
            _tris.Add(tris);
            foreach (string tri in tris)
            {
                if (!postings.TryGetValue(tri, out var list))
                {
                    list = new List<int>();
                    postings[tri] = list;
                }
                list.Add(entries[i].Id);
            }
        }
        _inverted = new Dictionary<string, int[]>(StringComparer.Ordinal);
        foreach (var kv in postings)
        {
            kv.Value.Sort();
            _inverted[kv.Key] = kv.Value.ToArray();
        }
    }

    public int Count => _entries.Count;

    public static GeocodeIndex Build(IReadOnlyList<GeocodeEntry> entries)
    {
        ArgumentNullException.ThrowIfNull(entries);
        var sorted = entries.OrderBy(e => e.Id).ToList();
        var seen = new HashSet<int>();
        foreach (var e in sorted)
        {
            ArgumentNullException.ThrowIfNull(e);
            if (string.IsNullOrWhiteSpace(e.Name))
                throw new ArgumentException("geocode entries need a non-empty name.");
            if (!seen.Add(e.Id))
                throw new ArgumentException($"duplicate geocode id {e.Id}.");
            if (e.Pop < 0.0 || e.Pop > 0.5 || double.IsNaN(e.Pop) || double.IsInfinity(e.Pop))
                throw new ArgumentException($"entry '{e.Name}': Pop must sit in [0, 0.5].");
        }
        return new GeocodeIndex(sorted);
    }

    /// <summary>Top-K matches: (entry, score) ordered by score desc, folded name, id.</summary>
    public IReadOnlyList<(GeocodeEntry Entry, double Score)> Query(string raw, int topK = DefaultTopK)
    {
        ArgumentNullException.ThrowIfNull(raw);
        if (topK <= 0) throw new ArgumentOutOfRangeException(nameof(topK));
        string q = GeocodeText.Normalize(raw);
        if (q.Length == 0) return Array.Empty<(GeocodeEntry, double)>();
        var qTris = GeocodeText.Trigrams(q);

        // Candidate set: union of postings for the query trigrams. A query
        // whose trigrams never occur still falls back to a full scan so that
        // exact-prefix queries over rare names (e.g. single-char) rank.
        var candidates = new HashSet<int>();
        foreach (string tri in qTris)
        {
            if (_inverted.TryGetValue(tri, out var ids))
            {
                foreach (int id in ids) candidates.Add(id);
            }
        }

        var scored = new List<(GeocodeEntry Entry, double Score, string Folded)>(candidates.Count);
        for (int i = 0; i < _entries.Count; i++)
        {
            if (candidates.Count > 0 && !candidates.Contains(_entries[i].Id)) continue;
            string folded = _folded[i];
            double prefixBonus = folded.StartsWith(q, StringComparison.Ordinal) ? 1.0 : 0.0;
            int overlap = 0;
            foreach (string tri in qTris)
            {
                if (_tris[i].Contains(tri)) overlap++;
            }
            // A lone shared padded trigram (e.g. "  z") is noise, not a hit:
            // keep prefix matches always, but require at least two shared
            // trigrams otherwise.
            if (prefixBonus == 0.0 && overlap < 2) continue;
            double overlapFrac = (double)overlap / qTris.Count;
            // Exact full-name equality is the strongest possible signal. The
            // base formula alone can rank a longer prefixed name higher (its
            // class/pop weights outweigh the overlap gap), so an exact match
            // earns one extra point and always wins its own query.
            double exactBonus = folded.Equals(q, StringComparison.Ordinal) ? 1.0 : 0.0;
            double score = 2.0 * prefixBonus + exactBonus + overlapFrac
                + ClassWeights[_entries[i].Kind] + _entries[i].Pop;
            scored.Add((_entries[i], score, folded));
        }
        scored.Sort((a, b) =>
        {
            int c = b.Score.CompareTo(a.Score);
            if (c != 0) return c;
            c = string.CompareOrdinal(a.Folded, b.Folded);
            if (c != 0) return c;
            return a.Entry.Id.CompareTo(b.Entry.Id);
        });
        return scored.Take(topK).Select(p => (p.Entry, p.Score)).ToArray();
    }

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    /// <summary>Deterministic asset JSON: entries by id, `\n` newlines, UTF-8 no BOM by the writer.</summary>
    public string ToJson()
    {
        var sb = new StringBuilder();
        sb.Append("{\"version\":\"").Append(AssetVersion).Append("\",\"entries\":[");
        for (int i = 0; i < _entries.Count; i++)
        {
            if (i > 0) sb.Append(',');
            var e = _entries[i];
            sb.Append("\n  {\"id\":").Append(e.Id)
              .Append(",\"name\":").Append(JsonSerializer.Serialize(e.Name, JsonOptions))
              .Append(",\"kind\":\"").Append(e.Kind.ToString().ToLowerInvariant()).Append('"')
              .Append(",\"class\":").Append(JsonSerializer.Serialize(e.Class, JsonOptions))
              .Append(",\"lon\":").Append(e.Lon.ToString("F7", CultureInfo.InvariantCulture))
              .Append(",\"lat\":").Append(e.Lat.ToString("F7", CultureInfo.InvariantCulture))
              .Append(",\"pop\":").Append(e.Pop.ToString("F3", CultureInfo.InvariantCulture))
              .Append('}');
        }
        sb.Append(_entries.Count > 0 ? "\n]}" : "]}");
        return sb.ToString().Replace("\r\n", "\n").Replace("\r", "\n") + "\n";
    }

    public static GeocodeIndex FromJson(string json)
    {
        ArgumentNullException.ThrowIfNull(json);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (!root.TryGetProperty("version", out var v) || v.GetString() != AssetVersion)
            throw new FormatException($"expected version '{AssetVersion}'.");
        var entries = new List<GeocodeEntry>();
        foreach (var el in root.GetProperty("entries").EnumerateArray())
        {
            string kindRaw = el.GetProperty("kind").GetString()
                ?? throw new FormatException("geocode entry needs a kind.");
            if (!Enum.TryParse<GeocodeKind>(kindRaw, ignoreCase: true, out var kind))
                throw new FormatException($"unknown geocode kind '{kindRaw}'.");
            entries.Add(new GeocodeEntry(
                el.GetProperty("id").GetInt32(),
                el.GetProperty("name").GetString() ?? throw new FormatException("entry needs a name."),
                kind,
                el.GetProperty("class").GetString() ?? "",
                el.GetProperty("lon").GetDouble(),
                el.GetProperty("lat").GetDouble(),
                el.GetProperty("pop").GetDouble()));
        }
        return Build(entries);
    }
}
