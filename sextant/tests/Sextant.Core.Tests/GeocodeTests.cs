// Phase-5 geocode gate: 50+ curated queries top-k recall over a pack-faithful
// corpus (12 POIs + 23 streets + 3 places + 2 diacritic probes), NFKD fold
// cases, empty/unknown queries, top-K cap, JSON asset round-trip, and
// determinism (same query twice replays identical order).

using Sextant.Core;

namespace Sextant.Core.Tests;

public sealed class GeocodeTests
{
    private static GeocodeIndex SampleIndex()
    {
        var entries = new List<GeocodeEntry>();
        int id = 0;
        void Add(string name, GeocodeKind kind, string cls, double lon, double lat, double pop)
            => entries.Add(new GeocodeEntry(id++, name, kind, cls, lon, lat, pop));

        // Pack-faithful corpus: pois layer, then roads, then water/landuse.
        (string Name, string Class)[] pois =
        {
            ("Powell Books", "shop"), ("Pioneer Square", "square"),
            ("Central Station", "station"), ("Riverside Cafe", "cafe"),
            ("City Hall", "civic"), ("Museum of Maps", "museum"),
            ("North Park Kiosk", "kiosk"), ("Union Bakery", "shop"),
            ("Elm Clinic", "health"), ("Grand Hotel", "hotel"),
            ("Library", "civic"), ("Ferry Dock", "station"),
        };
        foreach (var (name, cls) in pois)
            Add(name, GeocodeKind.Poi, cls, CityLon(name), CityLat(name), 0.3);
        for (int i = 1; i <= 11; i++) Add($"Avenue {i}", GeocodeKind.Street, "residential", -122.68, 45.51, 0.1);
        for (int i = 1; i <= 11; i++) Add($"Street {i}", GeocodeKind.Street, "residential", -122.67, 45.52, 0.1);
        Add("Burnside Diagonal", GeocodeKind.Street, "primary", -122.67, 45.515, 0.15);
        Add("River", GeocodeKind.Place, "water", -122.673, 45.515, 0.2);
        Add("Central Park", GeocodeKind.Place, "park", -122.674, 45.517, 0.2);
        Add("Pioneer Plaza", GeocodeKind.Place, "plaza", -122.672, 45.514, 0.2);
        // Diacritic probes (not in the pack): fold must still find them.
        Add("Cafe Noir", GeocodeKind.Poi, "cafe", -122.671, 45.516, 0.3);
        Add("Zurich Kiosk", GeocodeKind.Poi, "kiosk", -122.669, 45.513, 0.3);
        return GeocodeIndex.Build(entries);
    }

    private static double CityLon(string name) => -122.6765 + (Math.Abs(name.GetHashCode()) % 100) * 0.0001;
    private static double CityLat(string name) => 45.5152 + (Math.Abs(name.GetHashCode() / 127) % 100) * 0.0001;

    private static string Top1(GeocodeIndex idx, string q)
    {
        var hits = idx.Query(q);
        Assert.NotEmpty(hits);
        return hits[0].Entry.Name;
    }

    // -- folding ----------------------------------------------------------

    [Theory]
    [InlineData("Caf\u00e9", "cafe")]
    [InlineData("na\u00efve", "naive")]
    [InlineData("Z\u00fcrich", "zurich")]
    [InlineData("S\u00e3o Paulo", "sao paulo")]
    [InlineData("  Powell   Books ", "powell books")]
    [InlineData("MUSEUM OF MAPS", "museum of maps")]
    public void Normalize_FoldsDiacriticsCaseAndWhitespace(string raw, string want)
        => Assert.Equal(want, GeocodeText.Normalize(raw));

    [Fact]
    public void Trigrams_PaddedAndNonEmpty()
    {
        var tris = GeocodeText.Trigrams("ab");
        Assert.Contains("  a", tris);
        Assert.Contains("ab ", tris);
        Assert.NotEmpty(GeocodeText.Trigrams("x"));
    }

    // -- recall: exact + lowercase + prefix over the whole corpus ---------

    [Fact]
    public void CuratedQueries_ExactName_HitsTop1()
    {
        var idx = SampleIndex();
        string[] names =
        {
            "Powell Books", "Pioneer Square", "Central Station", "Riverside Cafe",
            "City Hall", "Museum of Maps", "North Park Kiosk", "Union Bakery",
            "Elm Clinic", "Grand Hotel", "Library", "Ferry Dock",
            "Burnside Diagonal", "River", "Central Park", "Pioneer Plaza",
            "Avenue 4", "Street 7",
        };
        Assert.True(names.Length >= 18);
        foreach (string name in names)
            Assert.Equal(name, Top1(idx, name));
    }

    [Fact]
    public void CuratedQueries_LowercaseName_HitsTop1()
    {
        var idx = SampleIndex();
        string[] names =
        {
            "powell books", "pioneer square", "central station", "riverside cafe",
            "city hall", "museum of maps", "north park kiosk", "union bakery",
            "elm clinic", "grand hotel", "library", "ferry dock",
            "burnside diagonal", "river", "central park", "pioneer plaza",
        };
        foreach (string name in names)
        {
            string top = Top1(idx, name);
            Assert.Equal(name, top.ToLowerInvariant());
        }
    }

    [Fact]
    public void CuratedQueries_UniquePrefix_HitsTop1()
    {
        var idx = SampleIndex();
        (string Query, string Want)[] cases =
        {
            ("powe", "Powell Books"), ("muse", "Museum of Maps"),
            ("ferr", "Ferry Dock"), ("burn", "Burnside Diagonal"),
            ("grand h", "Grand Hotel"), ("union b", "Union Bakery"),
            ("elm c", "Elm Clinic"), ("north p", "North Park Kiosk"),
            ("city h", "City Hall"), ("libr", "Library"),
            ("cafe n", "Cafe Noir"), ("zuri", "Zurich Kiosk"),
        };
        foreach (var (q, want) in cases)
            Assert.Equal(want, Top1(idx, q));
    }

    [Fact]
    public void CuratedQueries_AmbiguousPrefix_RanksCandidatesTop3()
    {
        var idx = SampleIndex();
        // "central" is a prefix of both Central Station and Central Park.
        var central = idx.Query("central").Select(h => h.Entry.Name).Take(3).ToHashSet();
        Assert.Contains("Central Station", central);
        Assert.Contains("Central Park", central);
        // "pioneer" is a prefix of Pioneer Square and Pioneer Plaza.
        var pioneer = idx.Query("pioneer").Select(h => h.Entry.Name).Take(3).ToHashSet();
        Assert.Contains("Pioneer Square", pioneer);
        Assert.Contains("Pioneer Plaza", pioneer);
        // "rive" matches Riverside Cafe (prefix) and River (prefix).
        var rive = idx.Query("rive").Select(h => h.Entry.Name).Take(2).ToHashSet();
        Assert.Contains("Riverside Cafe", rive);
    }

    [Fact]
    public void CuratedQueries_TypoTolerance()
    {
        var idx = SampleIndex();
        Assert.Equal("Powell Books", Top1(idx, "powel books"));
        var libary = idx.Query("libary").Select(h => h.Entry.Name).Take(3).ToHashSet();
        Assert.Contains("Library", libary);
    }

    [Fact]
    public void CuratedQueries_DiacriticQueries_FoldToMatch()
    {
        var idx = SampleIndex();
        Assert.Equal("Cafe Noir", Top1(idx, "caf\u00e9 noir"));
        Assert.Equal("Zurich Kiosk", Top1(idx, "z\u00fcrich"));
        Assert.Equal("Riverside Cafe", Top1(idx, "RIVERSIDE CAFE"));
    }

    // -- ranking shape ----------------------------------------------------

    [Fact]
    public void Query_PoiOutranksPlace_OnSharedPrefix()
    {
        var idx = SampleIndex();
        // "pioneer s" prefixes Pioneer Square (POI) only as full prefix, but
        // both square and plaza share "pioneer": the POI must come first.
        var hits = idx.Query("pioneer");
        int square = hits.ToList().FindIndex(h => h.Entry.Name == "Pioneer Square");
        int plaza = hits.ToList().FindIndex(h => h.Entry.Name == "Pioneer Plaza");
        Assert.True(square >= 0 && plaza >= 0 && square < plaza);
    }

    [Fact]
    public void Query_EmptyOrUnknown_YieldsEmpty()
    {
        var idx = SampleIndex();
        Assert.Empty(idx.Query("   "));
        Assert.Empty(idx.Query("zzzqx"));
    }

    [Fact]
    public void Query_RespectsTopK()
    {
        var idx = SampleIndex();
        var hits = idx.Query("e", topK: 3);
        Assert.True(hits.Count <= 3);
        Assert.Equal(GeocodeIndex.DefaultTopK, 8);
        Assert.True(idx.Query("avenue").Count <= 8);
    }

    [Fact]
    public void Query_DeterministicReplay()
    {
        var idx = SampleIndex();
        string[] probes = { "central", "street 1", "cafe", "pioneer", "avenue" };
        foreach (string q in probes)
        {
            var a = idx.Query(q).Select(h => (h.Entry.Id, h.Score)).ToArray();
            var b = idx.Query(q).Select(h => (h.Entry.Id, h.Score)).ToArray();
            Assert.Equal(a, b);
        }
    }

    [Fact]
    public void AssetJson_RoundTrip_PreservesRanking()
    {
        var idx = SampleIndex();
        string json = idx.ToJson();
        Assert.Contains("sextant-geocode/1", json);
        var back = GeocodeIndex.FromJson(json);
        Assert.Equal(idx.Count, back.Count);
        foreach (string q in new[] { "powell", "central", "street 3", "river", "library" })
        {
            var a = idx.Query(q).Select(h => h.Entry.Name).ToArray();
            var b = back.Query(q).Select(h => h.Entry.Name).ToArray();
            Assert.Equal(a, b);
        }
    }

    [Fact]
    public void AssetJson_WrongVersion_Rejected()
    {
        var ex = Assert.Throws<FormatException>(() =>
            GeocodeIndex.FromJson("{\"version\":\"nope\",\"entries\":[]}"));
        Assert.Contains("sextant-geocode/1", ex.Message);
    }

    [Fact]
    public void Build_RejectsDuplicatesAndBadPop()
    {
        var dup = new[]
        {
            new GeocodeEntry(1, "A", GeocodeKind.Poi, "shop", 0, 0, 0),
            new GeocodeEntry(1, "B", GeocodeKind.Poi, "shop", 0, 0, 0),
        };
        Assert.Throws<ArgumentException>(() => GeocodeIndex.Build(dup));
        var badPop = new[]
        {
            new GeocodeEntry(1, "A", GeocodeKind.Poi, "shop", 0, 0, 0.9),
        };
        Assert.Throws<ArgumentException>(() => GeocodeIndex.Build(badPop));
    }
}
