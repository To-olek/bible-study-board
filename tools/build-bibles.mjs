import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const outDir = path.join(root, "bibles");
const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "bible-study-board-"));

const books66 = [
  ["GEN", "Genesis"], ["EXO", "Exodus"], ["LEV", "Leviticus"], ["NUM", "Numbers"], ["DEU", "Deuteronomy"],
  ["JOS", "Joshua"], ["JDG", "Judges"], ["RUT", "Ruth"], ["1SA", "1 Samuel"], ["2SA", "2 Samuel"],
  ["1KI", "1 Kings"], ["2KI", "2 Kings"], ["1CH", "1 Chronicles"], ["2CH", "2 Chronicles"], ["EZR", "Ezra"],
  ["NEH", "Nehemiah"], ["EST", "Esther"], ["JOB", "Job"], ["PSA", "Psalms"], ["PRO", "Proverbs"],
  ["ECC", "Ecclesiastes"], ["SNG", "Song of Solomon"], ["ISA", "Isaiah"], ["JER", "Jeremiah"], ["LAM", "Lamentations"],
  ["EZK", "Ezekiel"], ["DAN", "Daniel"], ["HOS", "Hosea"], ["JOL", "Joel"], ["AMO", "Amos"],
  ["OBA", "Obadiah"], ["JON", "Jonah"], ["MIC", "Micah"], ["NAM", "Nahum"], ["HAB", "Habakkuk"],
  ["ZEP", "Zephaniah"], ["HAG", "Haggai"], ["ZEC", "Zechariah"], ["MAL", "Malachi"], ["MAT", "Matthew"],
  ["MRK", "Mark"], ["LUK", "Luke"], ["JHN", "John"], ["ACT", "Acts"], ["ROM", "Romans"],
  ["1CO", "1 Corinthians"], ["2CO", "2 Corinthians"], ["GAL", "Galatians"], ["EPH", "Ephesians"], ["PHP", "Philippians"],
  ["COL", "Colossians"], ["1TH", "1 Thessalonians"], ["2TH", "2 Thessalonians"], ["1TI", "1 Timothy"], ["2TI", "2 Timothy"],
  ["TIT", "Titus"], ["PHM", "Philemon"], ["HEB", "Hebrews"], ["JAS", "James"], ["1PE", "1 Peter"],
  ["2PE", "2 Peter"], ["1JN", "1 John"], ["2JN", "2 John"], ["3JN", "3 John"], ["JUD", "Jude"],
  ["REV", "Revelation"],
].map(([id, name]) => ({ id, name }));

const ebiblePacks = [
  {
    id: "eng-web",
    language: "English",
    languageCode: "eng",
    translation: "World English Bible",
    license: "Public Domain",
    source: "https://ebible.org/eng-web/",
    zip: "https://ebible.org/Scriptures/eng-web_html.zip",
  },
  {
    id: "russyn",
    language: "Russian",
    languageCode: "rus",
    translation: "Synodal Translation",
    license: "Public Domain",
    source: "https://ebible.org/russyn/",
    zip: "https://ebible.org/Scriptures/russyn_html.zip",
  },
  {
    id: "eng-asv",
    language: "English",
    languageCode: "eng",
    translation: "American Standard Version (1901)",
    license: "Public Domain",
    source: "https://ebible.org/eng-asv/",
    zip: "https://ebible.org/Scriptures/eng-asv_html.zip",
  },
  {
    id: "engbsb",
    language: "English",
    languageCode: "eng",
    translation: "Berean Standard Bible",
    license: "Public Domain",
    source: "https://ebible.org/engbsb/",
    zip: "https://ebible.org/Scriptures/engbsb_html.zip",
  },
  {
    id: "engnet",
    language: "English",
    languageCode: "eng",
    translation: "NET Bible",
    license: "Copyright © 1996-2016 Biblical Studies Press, L. L. C.",
    source: "https://ebible.org/engnet/",
    zip: "https://ebible.org/Scriptures/engnet_html.zip",
  },
  {
    id: "spa-rv1909",
    language: "Spanish",
    languageCode: "spa",
    translation: "Reina-Valera 1909",
    license: "Public Domain",
    source: "https://ebible.org/spaRV1909/",
    zip: "https://ebible.org/Scriptures/spaRV1909_html.zip",
  },
  {
    id: "spablm",
    language: "Spanish",
    languageCode: "spa",
    translation: "Spanish Free Bible for the World",
    license: "Public Domain",
    source: "https://ebible.org/spablm/",
    zip: "https://ebible.org/Scriptures/spablm_html.zip",
  },
  {
    id: "fra-lsg1910",
    language: "French",
    languageCode: "fra",
    translation: "Louis Segond 1910",
    license: "Public Domain",
    source: "https://ebible.org/fraLSG/",
    zip: "https://ebible.org/Scriptures/fraLSG_html.zip",
  },
  {
    id: "fra_fob",
    language: "French",
    languageCode: "fra",
    translation: "French Ostervald Bible",
    license: "Public Domain",
    source: "https://ebible.org/fra_fob/",
    zip: "https://ebible.org/Scriptures/fra_fob_html.zip",
  },
  {
    id: "deu-luther1912",
    language: "German",
    languageCode: "deu",
    translation: "Luther Bible 1912",
    license: "Public Domain",
    source: "https://ebible.org/deu1912/",
    zip: "https://ebible.org/Scriptures/deu1912_html.zip",
  },
  {
    id: "deuelo",
    language: "German",
    languageCode: "deu",
    translation: "Unrevised Elberfelder Bible",
    license: "Public Domain",
    source: "https://ebible.org/deuelo/",
    zip: "https://ebible.org/Scriptures/deuelo_html.zip",
  },
  {
    id: "ita-riveduta1927",
    language: "Italian",
    languageCode: "ita",
    translation: "Riveduta 1927",
    license: "Public Domain",
    source: "https://ebible.org/ita1927/",
    zip: "https://ebible.org/Scriptures/ita1927_html.zip",
  },
  {
    id: "ita1885",
    language: "Italian",
    languageCode: "ita",
    translation: "Diodati Bible 1885",
    license: "Public Domain",
    source: "https://ebible.org/ita1885/",
    zip: "https://ebible.org/Scriptures/ita1885_html.zip",
  },
  {
    id: "ukr-kulish",
    language: "Ukrainian",
    languageCode: "ukr",
    translation: "Kulish and Pulyuy 1905",
    license: "Public Domain",
    source: "https://ebible.org/ukr1871/",
    zip: "https://ebible.org/Scriptures/ukr1871_html.zip",
  },
  {
    id: "ukr1996",
    language: "Ukrainian",
    languageCode: "ukr",
    translation: "Ukrainian Bible, BJU 1996",
    license: "Copyright © 1996 Bob Jones University",
    source: "https://ebible.org/ukr1996/",
    zip: "https://ebible.org/Scriptures/ukr1996_html.zip",
  },
  {
    id: "ukrfb",
    language: "Ukrainian",
    languageCode: "ukr",
    translation: "Ukrainian Freedom Bible",
    license: "Public Domain",
    source: "https://ebible.org/ukrfb/",
    zip: "https://ebible.org/Scriptures/ukrfb_html.zip",
  },
  {
    id: "eng-kjv",
    language: "English",
    languageCode: "eng",
    translation: "King James Version",
    license: "Public Domain",
    source: "https://ebible.org/eng-kjv/",
    zip: "https://ebible.org/Scriptures/eng-kjv_html.zip",
  },
  {
    id: "cmn-cu89s",
    language: "Chinese",
    languageCode: "cmn",
    translation: "Chinese Union Version",
    license: "Public Domain",
    source: "https://ebible.org/cmn-cu89s/",
    zip: "https://ebible.org/Scriptures/cmn-cu89s_html.zip",
  },
  {
    id: "cmnswcb",
    language: "Chinese",
    languageCode: "cmn",
    translation: "World Chinese Bible",
    license: "Public Domain",
    source: "https://ebible.org/cmnswcb/",
    zip: "https://ebible.org/Scriptures/cmnswcb_html.zip",
  },
  {
    id: "porbrbsl",
    language: "Portuguese",
    languageCode: "por",
    translation: "World Portuguese Bible",
    license: "Public Domain",
    source: "https://ebible.org/porbrbsl/",
    zip: "https://ebible.org/Scriptures/porbrbsl_html.zip",
  },
  {
    id: "porbr2018",
    language: "Portuguese",
    languageCode: "por",
    translation: "Portuguese Biblia Livre",
    license: "Copyright © 2018 Diego Santos, Mario Sérgio, e Marco Teles",
    source: "https://ebible.org/porbr2018/",
    zip: "https://ebible.org/Scriptures/porbr2018_html.zip",
  },
  {
    id: "lat-vulgate",
    language: "Latin",
    languageCode: "lat",
    translation: "Clementine Vulgate",
    license: "Public Domain",
    source: "https://ebible.org/latVUC/",
    zip: "https://ebible.org/Scriptures/latVUC_html.zip",
  },
  {
    id: "ces1613",
    language: "Czech",
    languageCode: "ces",
    translation: "Bible Kralicka 1613",
    license: "Public Domain",
    source: "https://ebible.org/ces1613/",
    zip: "https://ebible.org/Scriptures/ces1613_html.zip",
  },
];

await mkdir(outDir, { recursive: true });

const manifest = [];
for (const pack of ebiblePacks) {
  console.log(`Building ${pack.id} from eBible...`);
  const bible = await buildFromEbible(pack);
  await writePack(bible);
  manifest.push(toManifestEntry(bible));
}

await writeFile(
  path.join(outDir, "manifest.js"),
  `window.BIBLE_MANIFEST = ${JSON.stringify(manifest)};\nwindow.BIBLE_PACKS = window.BIBLE_PACKS || {};\n`,
  "utf8",
);

await rm(tmpRoot, { recursive: true, force: true });
console.log(`Built ${manifest.length} Bible packs in ${outDir}`);

async function buildFromEbible(pack) {
  const zipPath = path.join(tmpRoot, `${pack.id}.zip`);
  const unpackDir = path.join(tmpRoot, pack.id);
  await download(pack.zip, zipPath);
  execFileSync("unzip", ["-q", zipPath, "-d", unpackDir]);
  const files = await listFiles(unpackDir);
  const fileByName = new Map(files.map((file) => [path.basename(file), file]));
  const books = [];

  for (const book of books66) {
    const chapters = [];
    const prefix = book.id;
    const chapterFiles = [...fileByName.keys()]
      .filter((name) => name.startsWith(prefix) && /^\d+\.htm$/i.test(name.slice(prefix.length)))
      .sort((a, b) => Number(a.slice(prefix.length, -4)) - Number(b.slice(prefix.length, -4)));
    for (const fileName of chapterFiles) {
      const html = await readFile(fileByName.get(fileName), "utf8");
      chapters.push(extractVerses(html));
    }
    books.push({ id: book.id, name: book.name, chapters });
  }

  return {
    id: pack.id,
    language: pack.language,
    languageCode: pack.languageCode,
    translation: pack.translation,
    license: pack.license,
    source: pack.source,
    books,
  };
}

async function writePack(bible) {
  const payload = JSON.stringify(bible);
  await writeFile(
    path.join(outDir, `${bible.id}.js`),
    `window.BIBLE_PACKS = window.BIBLE_PACKS || {};\nwindow.BIBLE_PACKS[${JSON.stringify(bible.id)}] = ${payload};\n`,
    "utf8",
  );
}

function toManifestEntry(bible) {
  return {
    id: bible.id,
    file: `${bible.id}.js`,
    language: bible.language,
    languageCode: bible.languageCode,
    translation: bible.translation,
    license: bible.license,
    source: bible.source,
  };
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, buffer);
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full));
    if (entry.isFile()) files.push(full);
  }
  return files;
}

function extractVerses(html) {
  const firstVerse = html.search(/<span class="verse" id="V\d+">/i);
  if (firstVerse < 0) return [];
  const nextNav = html.slice(firstVerse).search(/<ul class=['"]tnav['"]/i);
  const usable = nextNav >= 0 ? html.slice(firstVerse, firstVerse + nextNav) : html.slice(firstVerse);
  const regex = /<span class="verse" id="V(\d+)">[\s\S]*?<\/span>/g;
  const matches = [...usable.matchAll(regex)];
  const verses = [];
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : usable.length;
    verses.push(cleanHtml(usable.slice(start, end)));
  }
  return verses;
}

function cleanHtml(value) {
  return cleanText(decodeHtml(
    value
      .replace(/<a\b[^>]*class=["'][^"']*notemark[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, "")
      .replace(/<span\b[^>]*class=["'][^"']*popup[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, "")
      .replace(/<[^>]+>/g, " "),
  ));
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cleanText(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:?!])/g, "$1")
    .trim();
}
