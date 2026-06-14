import { normalizeGuess, normalizeList } from "./guessVerifier.js";
import { buildCatalogFromCompactTracks } from "./quizCatalog.js";
import {
  QUIZ_CATALOG_CACHE_PREFIX,
  readCachedQuizCatalog,
  writeCachedQuizCatalog,
} from "./catalogCache.js";

const ITUNES_SEARCH_ENDPOINT = "https://itunes.apple.com/search";

// Curated per-decade song lists. Each entry is resolved to a 30-second iTunes
// preview at load time, so the title/artist below are the canonical answers.
export const ONLINE_SEEDS = {
  "1960s": [
    { title: "Hey Jude", artist: "The Beatles" },
    { title: "I Want to Hold Your Hand", artist: "The Beatles" },
    { title: "(I Can't Get No) Satisfaction", artist: "The Rolling Stones" },
    { title: "Respect", artist: "Aretha Franklin" },
    { title: "My Girl", artist: "The Temptations" },
    { title: "Good Vibrations", artist: "The Beach Boys" },
    { title: "Brown Eyed Girl", artist: "Van Morrison" },
    { title: "Light My Fire", artist: "The Doors" },
    { title: "I Heard It Through the Grapevine", artist: "Marvin Gaye" },
    { title: "California Dreamin'", artist: "The Mamas & The Papas" },
    { title: "A Whiter Shade of Pale", artist: "Procol Harum" },
    { title: "Sittin' On the Dock of the Bay", artist: "Otis Redding" },
    { title: "Born to Be Wild", artist: "Steppenwolf" },
    { title: "House of the Rising Sun", artist: "The Animals" },
    { title: "Good Lovin'", artist: "The Young Rascals" },
    { title: "Ring of Fire", artist: "Johnny Cash" },
    { title: "These Boots Are Made for Walkin'", artist: "Nancy Sinatra" },
    { title: "Stand by Me", artist: "Ben E. King" },
    { title: "Daydream Believer", artist: "The Monkees" },
    { title: "Brown Sugar", artist: "The Rolling Stones" },
  ],
  "1970s": [
    { title: "Bohemian Rhapsody", artist: "Queen" },
    { title: "Stairway to Heaven", artist: "Led Zeppelin" },
    { title: "Imagine", artist: "John Lennon" },
    { title: "Hotel California", artist: "Eagles" },
    { title: "Dancing Queen", artist: "ABBA" },
    { title: "Let's Stay Together", artist: "Al Green" },
    { title: "Superstition", artist: "Stevie Wonder" },
    { title: "American Pie", artist: "Don McLean" },
    { title: "I Will Survive", artist: "Gloria Gaynor" },
    { title: "Stayin' Alive", artist: "Bee Gees" },
    { title: "Sweet Home Alabama", artist: "Lynyrd Skynyrd" },
    { title: "Dream On", artist: "Aerosmith" },
    { title: "Piano Man", artist: "Billy Joel" },
    { title: "Go Your Own Way", artist: "Fleetwood Mac" },
    { title: "Hot Stuff", artist: "Donna Summer" },
    { title: "Heart of Gold", artist: "Neil Young" },
    { title: "Take It Easy", artist: "Eagles" },
    { title: "More Than a Feeling", artist: "Boston" },
    { title: "Y.M.C.A.", artist: "Village People" },
    { title: "Killer Queen", artist: "Queen" },
  ],
  "1980s": [
    { title: "Billie Jean", artist: "Michael Jackson" },
    { title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
    { title: "Take On Me", artist: "a-ha" },
    { title: "Like a Prayer", artist: "Madonna" },
    { title: "Every Breath You Take", artist: "The Police" },
    { title: "Don't Stop Believin'", artist: "Journey" },
    { title: "Livin' on a Prayer", artist: "Bon Jovi" },
    { title: "Africa", artist: "TOTO" },
    { title: "Sweet Dreams (Are Made of This)", artist: "Eurythmics" },
    { title: "Wake Me Up Before You Go-Go", artist: "Wham!" },
    { title: "With or Without You", artist: "U2" },
    { title: "Girls Just Want to Have Fun", artist: "Cyndi Lauper" },
    { title: "Beat It", artist: "Michael Jackson" },
    { title: "Tainted Love", artist: "Soft Cell" },
    { title: "Karma Chameleon", artist: "Culture Club" },
    { title: "I Wanna Dance with Somebody", artist: "Whitney Houston" },
    { title: "Don't You (Forget About Me)", artist: "Simple Minds" },
    { title: "Time After Time", artist: "Cyndi Lauper" },
    { title: "Purple Rain", artist: "Prince" },
    { title: "Tom's Diner", artist: "Suzanne Vega" },
  ],
  "1990s": [
    { title: "Smells Like Teen Spirit", artist: "Nirvana" },
    { title: "Wonderwall", artist: "Oasis" },
    { title: "...Baby One More Time", artist: "Britney Spears" },
    { title: "No Scrubs", artist: "TLC" },
    { title: "Wannabe", artist: "Spice Girls" },
    { title: "Creep", artist: "Radiohead" },
    { title: "Vogue", artist: "Madonna" },
    { title: "I Will Always Love You", artist: "Whitney Houston" },
    { title: "Black or White", artist: "Michael Jackson" },
    { title: "Gangsta's Paradise", artist: "Coolio" },
    { title: "Bittersweet Symphony", artist: "The Verve" },
    { title: "Zombie", artist: "The Cranberries" },
    { title: "Under the Bridge", artist: "Red Hot Chili Peppers" },
    { title: "Killing Me Softly With His Song", artist: "Fugees" },
    { title: "Torn", artist: "Natalie Imbruglia" },
    { title: "Believe", artist: "Cher" },
    { title: "Losing My Religion", artist: "R.E.M." },
    { title: "Genie in a Bottle", artist: "Christina Aguilera" },
    { title: "Everybody (Backstreet's Back)", artist: "Backstreet Boys" },
    { title: "Basket Case", artist: "Green Day" },
  ],
  "2000s": [
    { title: "Hey Ya!", artist: "OutKast" },
    { title: "Crazy in Love", artist: "Beyoncé" },
    { title: "Mr. Brightside", artist: "The Killers" },
    { title: "In the End", artist: "Linkin Park" },
    { title: "Hot N Cold", artist: "Katy Perry" },
    { title: "Seven Nation Army", artist: "The White Stripes" },
    { title: "Toxic", artist: "Britney Spears" },
    { title: "Beautiful Day", artist: "U2" },
    { title: "Hips Don't Lie", artist: "Shakira" },
    { title: "Umbrella", artist: "Rihanna" },
    { title: "I Gotta Feeling", artist: "The Black Eyed Peas" },
    { title: "Viva la Vida", artist: "Coldplay" },
    { title: "Since U Been Gone", artist: "Kelly Clarkson" },
    { title: "Boulevard of Broken Dreams", artist: "Green Day" },
    { title: "Lose Yourself", artist: "Eminem" },
    { title: "Complicated", artist: "Avril Lavigne" },
    { title: "Yeah!", artist: "Usher" },
    { title: "Chasing Cars", artist: "Snow Patrol" },
    { title: "Bad Day", artist: "Daniel Powter" },
    { title: "Sex on Fire", artist: "Kings of Leon" },
  ],
  "2010s": [
    { title: "Rolling in the Deep", artist: "Adele" },
    { title: "Uptown Funk", artist: "Mark Ronson" },
    { title: "Shape of You", artist: "Ed Sheeran" },
    { title: "Blinding Lights", artist: "The Weeknd" },
    { title: "Happy", artist: "Pharrell Williams" },
    { title: "Bad Guy", artist: "Billie Eilish" },
    { title: "Somebody That I Used to Know", artist: "Gotye" },
    { title: "Get Lucky", artist: "Daft Punk" },
    { title: "Shake It Off", artist: "Taylor Swift" },
    { title: "Royals", artist: "Lorde" },
    { title: "Radioactive", artist: "Imagine Dragons" },
    { title: "Call Me Maybe", artist: "Carly Rae Jepsen" },
    { title: "Counting Stars", artist: "OneRepublic" },
    { title: "Take Me to Church", artist: "Hozier" },
    { title: "Thinking Out Loud", artist: "Ed Sheeran" },
    { title: "Despacito", artist: "Luis Fonsi" },
    { title: "Old Town Road", artist: "Lil Nas X" },
    { title: "Wake Me Up", artist: "Avicii" },
    { title: "Levels", artist: "Avicii" },
    { title: "Pumped Up Kicks", artist: "Foster the People" },
  ],
};

export const ONLINE_PLAYLIST_OPTIONS = Object.keys(ONLINE_SEEDS).map((key) => ({
  id: key,
  name: key,
}));

export const ONLINE_DEFAULT_PLAYLIST_ID = ONLINE_PLAYLIST_OPTIONS[0]?.id || "";

async function mapWithConcurrency(items, limit, mapper) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );

  return results;
}

async function resolveItunesTrack({ title, artist }) {
  const term = `${artist} ${title}`;
  const url = `${ITUNES_SEARCH_ENDPOINT}?term=${encodeURIComponent(
    term
  )}&entity=song&limit=5`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const candidates = (data.results || []).filter(
      (result) => result.previewUrl && result.trackName && result.artistName
    );
    if (!candidates.length) return null;

    const wantedTitle = normalizeGuess(title);
    const wantedArtist = normalizeGuess(artist);

    const best =
      candidates.find(
        (result) =>
          normalizeGuess(result.trackName) === wantedTitle &&
          normalizeGuess(result.artistName).includes(wantedArtist)
      ) ||
      candidates.find(
        (result) => normalizeGuess(result.trackName) === wantedTitle
      ) ||
      candidates[0];

    return best || null;
  } catch (error) {
    console.warn("iTunes lookup failed for", term, error);
    return null;
  }
}

function compactItunesTrack(result) {
  const name = result.trackName;
  const artists = [result.artistName];

  return {
    id: `itunes:${result.trackId}`,
    previewUrl: result.previewUrl,
    name,
    artists,
    durationMs: result.trackTimeMillis || 0,
    albumImage: (result.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
    normalizedSongNames: normalizeList([name]),
    normalizedArtistNames: normalizeList(artists),
  };
}

export async function buildOnlineCatalog(decadeKey) {
  const seeds = ONLINE_SEEDS[decadeKey];
  if (!seeds) {
    throw new Error(`Unknown online playlist "${decadeKey}".`);
  }

  const cacheKey = `${QUIZ_CATALOG_CACHE_PREFIX}online:${decadeKey}`;
  const cachedCatalog = readCachedQuizCatalog(cacheKey);
  if (cachedCatalog?.tracks?.length) {
    return { playlist: { id: decadeKey, name: decadeKey }, catalog: cachedCatalog };
  }

  const resolved = await mapWithConcurrency(seeds, 6, resolveItunesTrack);

  const seenTrackIds = new Set();
  const compactTracks = [];
  resolved.forEach((result) => {
    if (!result || seenTrackIds.has(result.trackId)) return;
    seenTrackIds.add(result.trackId);
    compactTracks.push(compactItunesTrack(result));
  });

  if (!compactTracks.length) {
    throw new Error(`Could not load any songs from iTunes for ${decadeKey}.`);
  }

  const catalog = buildCatalogFromCompactTracks({
    playlistId: decadeKey,
    playlistName: decadeKey,
    snapshotId: `online:${decadeKey}:${compactTracks.length}`,
    compactTracks,
  });

  writeCachedQuizCatalog(cacheKey, catalog);

  return { playlist: { id: decadeKey, name: decadeKey }, catalog };
}
