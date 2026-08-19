const state = {
  articles: [],
  articleCache: new Map(),
  searchManifest: undefined,
  searchChunks: new Map(),
  tree: [],
  tags: {},
  sections: [],
  categoryMax: new Map(),
  renderToken: 0
};

const app = document.querySelector("#app");
const HOME_SECTION_ORDER = ["認識淨土宗", "法師著作", "感應故事", "淨土文庫", "書籍下載"];
const HOME_PATH_ORDER = [
  "認識淨土宗",
  "法師著作/慧淨法師",
  "法師著作/淨宗法師",
  "感應故事/念佛感應",
  "感應故事/念佛往生",
  "感應故事/因果感應故事",
  "淨土文庫/淨土宗園地",
  "淨土文庫/宗道法師文章",
  "淨土文庫/淨土宗文集",
  "淨土文庫/淨土宗法語",
  "淨土文庫/淨土宗妙喻",
  "淨土文庫/淨土小常識",
  "書籍下載"
];
const HOME_COLLAPSED_PATHS = new Set([
  "淨土文庫/宗道法師文章"
]);
const COLLAPSE_PATH_WRAPPERS = new Set([
  "認識淨土宗/簡介",
  "法師著作/慧淨法師/法語",
  "法師著作/淨宗法師/文章",
  "感應故事/因果感應故事"
]);
const DISPLAY_LABELS = {
  "認識淨土宗": "淨宗簡介",
  "宗道法師文章": "宗道法師",
  "書籍下載": "淨土叢書"
};
const DISPLAY_PATH_LABELS = {
  "法師著作/淨宗法師/法談開示/法談開示": "一般開示"
};
const SOURCE_TO_PUBLIC_PATHS = new Map(
  [
    [["認識淨土宗", "簡介", "簡介"], ["認識淨土宗", "簡介"]],
    [["認識淨土宗", "簡介", "宗旨"], ["認識淨土宗", "宗旨"]],
    [["認識淨土宗", "簡介", "特色"], ["認識淨土宗", "特色"]],
    [["認識淨土宗", "簡介", "宗風"], ["認識淨土宗", "宗風"]],
    [["認識淨土宗", "簡介", "宗徽"], ["認識淨土宗", "宗徽"]],
    [["法師著作", "慧淨法師", "法語", "法語一"], ["法師著作", "慧淨法師", "法語一"]],
    [["法師著作", "慧淨法師", "法語", "法語二"], ["法師著作", "慧淨法師", "法語二"]],
    [["法師著作", "淨宗法師", "文章", "短文"], ["法師著作", "淨宗法師", "短文"]],
    [["感應故事", "因果感應故事", "靈異奇聞篇"], ["感應故事", "靈異奇聞篇"]]
  ].map(([source, publicParts]) => [pathKey(source), publicParts])
);
const PUBLIC_TO_SOURCE_PATHS = new Map(
  [...SOURCE_TO_PUBLIC_PATHS.entries()].map(([source, publicParts]) => [pathKey(publicParts), source.split("/")])
);
const PATH_DISPLAY_ORDER = buildPathDisplayOrder([
  ["認識淨土宗/簡介", ["簡介", "宗旨", "特色", "宗風", "宗徽"]],
  ["法師著作/慧淨法師/講義", ["經典部分", "祖論部分", "第十八願", "經證．祖語", "淨土宗教理"]],
  ["法師著作/慧淨法師/編述", ["經證．祖傳", "淨土宗教理", "規約", "我的命盤"]],
  [
    "法師著作/慧淨法師/法談開示",
    ["通俗講演", "法義開示", "宗風", "臨終開示", "訪問篇", "問答", "第十八願善導釋", "淨土法門的核心", "阿彌陀佛四十八題"]
  ],
  [
    "法師著作/淨宗法師/法談開示",
    ["石家莊念佛開示", "念佛往生開示", "法談開示", "觀經疏四重判講記", "淨土宗概論講記", "善導大師的淨土思想", "念佛安心法語講解"]
  ],
  ["淨土文庫/宗道法師文章", ["法義", "問答", "文章", "法師簡介"]]
]);
const AUTHOR_CATEGORY_ORDER = [
  "法談開示",
  "講義",
  "文章",
  "短文",
  "法語",
  "法語一",
  "法語二",
  "序文",
  "翻譯",
  "編述",
  "演講摘錄",
  "淨土釋疑",
  "念佛問答",
  "信函"
];
const PATH_LABEL_SLUGS = new Map([
  ["認識淨土宗", "intro"],
  ["簡介", "about"],
  ["宗旨", "purpose"],
  ["特色", "features"],
  ["宗風", "style"],
  ["宗徽", "emblem"],
  ["法師著作", "masters"],
  ["慧淨法師", "huijing"],
  ["淨宗法師", "jingzong"],
  ["法談開示", "talks"],
  ["講義", "lectures"],
  ["文章", "articles"],
  ["短文", "short"],
  ["法語", "sayings"],
  ["法語一", "sayings-1"],
  ["序文", "prefaces"],
  ["翻譯", "translations"],
  ["編述", "compilations"],
  ["演講摘錄", "excerpts"],
  ["淨土釋疑", "questions"],
  ["念佛問答", "nianfo-qa"],
  ["信函", "letters"],
  ["經典部分", "sutras"],
  ["祖論部分", "ancestral-texts"],
  ["第十八願", "18th-vow"],
  ["經證．祖語", "proofs"],
  ["淨土宗教理", "doctrine"],
  ["規約", "rules"],
  ["我的命盤", "fate"],
  ["通俗講演", "public-talks"],
  ["法義開示", "dharma-talks"],
  ["臨終開示", "final-moments"],
  ["訪問篇", "interviews"],
  ["問答", "qa"],
  ["第十八願善導釋", "shandao-18"],
  ["淨土法門的核心", "core"],
  ["阿彌陀佛四十八題", "48-questions"],
  ["佛說阿彌陀經講義", "amitabha-sutra"],
  ["石家莊念佛開示", "shijiazhuang-nianfo"],
  ["念佛安心法語講解", "peace-sayings"],
  ["念佛往生開示", "rebirth-teachings"],
  ["淨土宗概論講記", "intro-course"],
  ["善導大師的淨土思想", "shandao-thought"],
  ["觀經疏四重判講記", "guan-jing-shu"],
  ["感應故事", "stories"],
  ["念佛往生", "rebirth"],
  ["念佛感應", "responses"],
  ["因果感應故事", "karma"],
  ["靈異奇聞篇", "wonders"],
  ["淨土文庫", "library"],
  ["淨土宗園地", "garden"],
  ["宗道法師文章", "zongdao"],
  ["法義", "dharma"],
  ["法師簡介", "bio"],
  ["淨土宗文集", "essays"],
  ["淨土宗法語", "quotes"],
  ["淨土宗妙喻", "parables"],
  ["淨土小常識", "basics"],
  ["書籍下載", "books"],
  ["淨土宗叢書", "pureland-series"],
  ["法語二", "sayings-2"],
  ["經證．祖傳", "proofs-biographies"]
]);
const PATH_SLUG_LABELS = new Map([...PATH_LABEL_SLUGS.entries()].map(([label, slug]) => [slug, label]));
const BASE_ARTICLE_BODY_SIZE = 16 * 1.12;
const MAX_ARTICLE_BODY_SIZE = 40;
const MIN_FONT_SCALE = 0.9;
const MAX_FONT_SCALE = Number((MAX_ARTICLE_BODY_SIZE / BASE_ARTICLE_BODY_SIZE).toFixed(2));
const INITIAL_SEARCH_RENDER_SIZE = 20;
const BACKGROUND_SEARCH_BATCH_SIZE = 20;
const DIRECTORY_PAGE_SIZE = 120;
const CACHE_VERSION = new URLSearchParams(location.search).get("v") || "dev";
const settings = {
  theme: localStorage.getItem("plb-theme") || "light",
  fontScale: Number(localStorage.getItem("plb-font-scale") || 1)
};

applySettings();
wireSettings();
wireGlobalSearch();
wireHeaderSectionFilter();
wireDirectoryDrawer();
syncStickyHeaderHeight();
window.addEventListener("resize", syncStickyHeaderHeight);
const stickyHeader = document.querySelector(".site-header");
if (stickyHeader && "ResizeObserver" in window) {
  new ResizeObserver(syncStickyHeaderHeight).observe(stickyHeader);
}

async function loadData() {
  const [articles, tree, tags] = await Promise.all([
    fetch(dataUrl("./data/article_index.json")).then((res) => res.json()),
    fetch(dataUrl("./data/tree.json")).then((res) => res.json()),
    fetch(dataUrl("./data/tags.json")).then((res) => res.json())
  ]);
  state.articles = articles;
  state.tree = tree;
  state.tags = tags;
  state.sections = [...new Set(articles.map((item) => item.displayPath[0]))];
  state.categoryMax = buildCategoryMax(articles);
  populateHeaderSectionFilter();
}

async function loadArticle(id) {
  if (state.articleCache.has(id)) return state.articleCache.get(id);
  const response = await fetch(dataUrl(`./data/articles/${encodeURIComponent(id)}.json`));
  if (!response.ok) return null;
  const article = await response.json();
  state.articleCache.set(id, article);
  return article;
}

async function loadSearchManifest() {
  if (state.searchManifest !== undefined) return state.searchManifest;
  try {
    const response = await fetch(dataUrl("./data/search_manifest.json"));
    state.searchManifest = response.ok ? await response.json() : null;
  } catch {
    state.searchManifest = null;
  }
  return state.searchManifest;
}

async function loadSearchChunk(chunk) {
  if (state.searchChunks.has(chunk.file)) return state.searchChunks.get(chunk.file);
  const records = await fetch(dataUrl(`./data/${chunk.file}`)).then((res) => res.json());
  state.searchChunks.set(chunk.file, records);
  return records;
}

function dataUrl(url) {
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(CACHE_VERSION)}`;
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function byId(id) {
  return state.articles.find((item) => item.id === id);
}

function readingItems() {
  return state.articles.filter((item) => item.kind !== "book");
}

function sortNewest(items) {
  return [...items].sort((a, b) => {
    const categoryCompare = compareCategoryOrder(a, b);
    if (categoryCompare !== 0) return categoryCompare;
    const orderA = Number(a.sourceOrder || 0);
    const orderB = Number(b.sourceOrder || 0);
    if (orderA !== orderB) return orderB - orderA;
    return a.title.localeCompare(b.title, "zh-Hant");
  });
}

function sortOldest(items) {
  return [...items].sort((a, b) => {
    const categoryCompare = compareCategoryOrder(a, b);
    if (categoryCompare !== 0) return categoryCompare;
    const orderA = Number(a.sourceOrder || 0);
    const orderB = Number(b.sourceOrder || 0);
    if (orderA !== orderB) return orderA - orderB;
    return a.title.localeCompare(b.title, "zh-Hant");
  });
}

function sortByMode(items, mode) {
  return mode === "oldest" ? sortOldest(items) : sortNewest(items);
}

function orderLabel(item) {
  if (!item.sourceOrder) return item.kindLabel;
  const max = state.categoryMax.get(categoryKey(item)) || item.sourceOrder;
  const width = Math.max(3, String(max).length);
  return `#${String(item.sourceOrder).padStart(width, "0")}`;
}

function categoryKey(item) {
  return item.displayPath.join("/");
}

function compareCategoryOrder(a, b) {
  const fixedCompare = compareFixedCategoryOrder(a, b);
  if (fixedCompare !== 0) return fixedCompare;
  return categoryKey(a).localeCompare(categoryKey(b), "zh-Hant");
}

function compareFixedCategoryOrder(a, b) {
  const fixedA = PATH_DISPLAY_ORDER.get(categoryKey(a));
  const fixedB = PATH_DISPLAY_ORDER.get(categoryKey(b));
  if (fixedA != null && fixedB != null && a.displayPath.slice(0, -1).join("/") === b.displayPath.slice(0, -1).join("/")) {
    return fixedA - fixedB;
  }
  return 0;
}

function pathKey(parts) {
  return parts.join("/");
}

function displayLabel(value) {
  return DISPLAY_LABELS[value] || value;
}

function displayPathLabel(parts) {
  return DISPLAY_PATH_LABELS[pathKey(parts)] || displayLabel(parts.at(-1));
}

function displayPathEntries(parts) {
  const normalized = [];
  for (let index = 0; index < parts.length; index += 1) {
    const current = parts[index];
    const currentParts = parts.slice(0, index + 1);
    const parentKey = pathKey(parts.slice(0, index));
    if (COLLAPSE_PATH_WRAPPERS.has(parentKey)) {
      normalized.pop();
      normalized.push({ label: displayPathLabel(currentParts), hrefParts: publicPathParts(currentParts) });
      continue;
    }
    normalized.push({
      label: displayPathLabel(currentParts),
      hrefParts: publicPathParts(currentParts)
    });
  }
  return normalized;
}

function displayPathText(parts) {
  return displayPathEntries(parts).map((entry) => entry.label).join(" / ");
}

function displayPathLeaf(parts) {
  return displayPathEntries(parts).at(-1)?.label || "";
}

function pathHref(parts, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const routeParts = publicPathParts(parts);
  const slug = pathSlug(routeParts);
  if (slug) return `#/p/${slug}${suffix}`;
  return `#/path/${encodeURIComponent(pathKey(routeParts))}${suffix}`;
}

function pathMatches(item, parts) {
  return parts.every((part, index) => item.displayPath[index] === part);
}

function parsePathRoute(value = "") {
  return sourcePathParts(decodeURIComponent(value).split("/").filter(Boolean));
}

function pathSlug(parts) {
  const slugs = parts.map((part) => PATH_LABEL_SLUGS.get(part));
  return slugs.every(Boolean) ? slugs.join("--") : "";
}

function parsePathSlug(value = "") {
  const parts = value.split("--").map((part) => PATH_SLUG_LABELS.get(part)).filter(Boolean);
  return sourcePathParts(parts.length ? parts : parsePathRoute(value));
}

function publicPathParts(parts) {
  return SOURCE_TO_PUBLIC_PATHS.get(pathKey(parts)) || parts;
}

function sourcePathParts(parts) {
  return PUBLIC_TO_SOURCE_PATHS.get(pathKey(parts)) || parts;
}

function hashParams() {
  return new URLSearchParams(location.hash.split("?")[1] || "");
}

function categoryLabel(item) {
  return item.displayPath.at(-1) || item.kindLabel;
}

function buildCategoryMax(items) {
  const max = new Map();
  for (const item of items) {
    if (!item.sourceOrder) continue;
    const key = categoryKey(item);
    max.set(key, Math.max(max.get(key) || 0, item.sourceOrder));
  }
  return max;
}

function applySettings() {
  settings.fontScale = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, settings.fontScale));
  localStorage.setItem("plb-font-scale", String(settings.fontScale));
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty("--reader-scale", String(settings.fontScale));
  document.documentElement.style.setProperty(
    "--article-root-size",
    `${(16 * settings.fontScale).toFixed(2)}px`
  );
  scaleArticleInlineFontSizes();
  const themeButton = document.querySelector("[data-setting='theme']");
  if (themeButton) themeButton.textContent = settings.theme === "dark" ? "亮" : "深";
  syncFontButtons();
}

function syncFontButtons() {
  const downButton = document.querySelector("[data-setting='font-down']");
  const upButton = document.querySelector("[data-setting='font-up']");
  if (!downButton || !upButton) return;
  downButton.disabled = settings.fontScale <= MIN_FONT_SCALE;
  upButton.disabled = settings.fontScale >= MAX_FONT_SCALE;
  downButton.title = downButton.disabled ? "已是最小字級" : "縮小字級";
  upButton.title = upButton.disabled ? "已是最大字級" : "放大字級";
}

function scaleArticleInlineFontSizes(root = document) {
  const scope = root.querySelector?.(".article-body") || root;
  scope.querySelectorAll?.("[style*='font-size']").forEach((element) => {
    const original = element.dataset.originalFontSize || element.style.fontSize;
    if (!original) return;
    element.dataset.originalFontSize = original;
    const match = original.trim().match(/^([0-9.]+)(px|pt|em|rem|%)$/i);
    if (!match) return;
    const value = Number(match[1]);
    const unit = match[2];
    element.style.fontSize = `${Number((value * settings.fontScale).toFixed(2))}${unit}`;
  });
}

function prepareArticleDarkThemeStyles(root = document) {
  const scope = root.querySelector?.(".article-body");
  if (!scope) return;
  scope.querySelectorAll("[style*='color'], font[color], [style*='background-color']").forEach((element) => {
    const textColor = declaredTextColor(element);
    if (textColor) {
      element.dataset.darkColor = "";
      element.style.setProperty("--dark-readable-color", readableDarkTextColor(textColor));
    }
    const backgroundColor = declaredBackgroundColor(element);
    if (backgroundColor) {
      element.dataset.darkBackground = "";
      element.style.setProperty("--dark-readable-background", readableDarkBackgroundColor(backgroundColor));
    }
  });
}

function declaredTextColor(element) {
  return element.getAttribute("color") || element.style.color || "";
}

function declaredBackgroundColor(element) {
  return element.style.backgroundColor || "";
}

function readableDarkTextColor(value) {
  const rgb = parseCssColor(value);
  if (!rgb) return "#ffffff";
  if (isNearColor(rgb, [0, 0, 128]) || isNearColor(rgb, [0, 0, 139])) return "#00eeff";
  if (isNearColor(rgb, [0, 0, 0])) return "#ffffff";
  if (rgb[0] > rgb[1] + rgb[2] && rgb[0] > 110) return "#ff9a8f";
  if (rgb[2] > rgb[0] + 30 && rgb[2] > rgb[1] + 10) return "#69b7ff";
  if (rgb[1] > rgb[0] + 20 && rgb[1] > rgb[2] + 20) return "#70f285";
  if (relativeLuminance(rgb) < 0.42) return brightenForDark(rgb);
  return rgbToHex(rgb);
}

function readableDarkBackgroundColor(value) {
  const rgb = parseCssColor(value);
  if (!rgb) return "transparent";
  if (relativeLuminance(rgb) < 0.18) return "#24211c";
  if (relativeLuminance(rgb) > 0.82) return "#2d281f";
  return rgbToHex(rgb.map((part) => Math.max(24, Math.round(part * 0.65))));
}

function parseCssColor(value) {
  const raw = String(value || "").trim().toLowerCase();
  const named = {
    black: "#000000",
    white: "#ffffff",
    navy: "#000080",
    blue: "#0000ff",
    red: "#ff0000",
    green: "#008000",
    gray: "#808080",
    grey: "#808080",
    purple: "#800080",
    maroon: "#800000"
  };
  const normalized = named[raw] || raw;
  const shortHex = normalized.match(/^#([0-9a-f]{3})$/i);
  if (shortHex) return shortHex[1].split("").map((ch) => parseInt(ch + ch, 16));
  const hex = normalized.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((offset) => parseInt(hex[1].slice(offset, offset + 2), 16));
  const rgb = normalized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgb) return rgb.slice(1, 4).map((part) => clampNumber(Number(part), 0, 255));
  return null;
}

function isNearColor(rgb, target) {
  return rgb.every((part, index) => Math.abs(part - target[index]) <= 18);
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((part) => {
    const channel = part / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function brightenForDark(rgb) {
  const max = Math.max(...rgb, 1);
  const scale = max < 90 ? 190 / max : 150 / max;
  return rgbToHex(rgb.map((part) => clampNumber(Math.round(part * scale + 35), 0, 255)));
}

function rgbToHex(rgb) {
  return `#${rgb.map((part) => clampNumber(Math.round(part), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wireSettings() {
  document.querySelector("[data-setting='theme']").addEventListener("click", () => {
    settings.theme = settings.theme === "dark" ? "light" : "dark";
    localStorage.setItem("plb-theme", settings.theme);
    applySettings();
  });
  document.querySelector("[data-setting='font-down']").addEventListener("click", () => {
    settings.fontScale = Math.max(MIN_FONT_SCALE, Number((settings.fontScale - 0.08).toFixed(2)));
    localStorage.setItem("plb-font-scale", String(settings.fontScale));
    applySettings();
  });
  document.querySelector("[data-setting='font-up']").addEventListener("click", () => {
    settings.fontScale = Math.min(MAX_FONT_SCALE, Number((settings.fontScale + 0.08).toFixed(2)));
    localStorage.setItem("plb-font-scale", String(settings.fontScale));
    applySettings();
  });
}

function wireGlobalSearch() {
  const form = document.querySelector("[data-global-search]");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = new FormData(form).get("q");
    location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });
}

function wireHeaderSectionFilter() {
  const select = document.querySelector("[data-header-section-filter]");
  if (!select) return;
  select.addEventListener("change", (event) => {
    const q = hashParams().get("q") || document.querySelector("[data-global-search] input")?.value || "";
    location.hash = searchHref({ q, section: event.target.value });
  });
}

function populateHeaderSectionFilter(selected = "all") {
  const select = document.querySelector("[data-header-section-filter]");
  if (!select) return;
  select.innerHTML = `
    <option value="all">全部</option>
    ${state.sections.map((name) => `<option value="${esc(name)}">${esc(displayLabel(name))}</option>`).join("")}
  `;
  select.value = selected;
}

function setHeaderSectionFilterVisible(visible, selected = "all") {
  const select = document.querySelector("[data-header-section-filter]");
  if (!select) return;
  populateHeaderSectionFilter(selected);
  select.hidden = !visible;
  syncStickyHeaderHeight();
}

function syncGlobalSearch(q = "") {
  const input = document.querySelector("[data-global-search] input");
  if (input && document.activeElement !== input) input.value = q;
}

function syncStickyHeaderHeight() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  document.documentElement.style.setProperty("--sticky-header-height", `${header.getBoundingClientRect().height}px`);
}

function groupBy(items, keyFn) {
  return items.reduce((map, item) => {
    const key = keyFn(item);
    map.set(key, [...(map.get(key) || []), item]);
    return map;
  }, new Map());
}

async function render() {
  state.renderToken += 1;
  const routeText = location.hash.replace(/^#\/?/, "").split("?")[0];
  const [route = "", id = ""] = routeText.split("/");
  const params = hashParams();
  syncGlobalSearch(route === "search" ? params.get("q") || "" : "");
  const searchPath = params.get("scope") ? parsePathSlug(params.get("scope")) : params.get("path") ? parsePathRoute(params.get("path")) : [];
  setHeaderSectionFilterVisible(route === "search", searchPath[0] || params.get("section") || "all");
  resetHeaderArticleNav();
  resetDirectoryDrawer();
  if (!route) return renderHome();
  if (route === "article") return renderArticle(id);
  if (route === "section") return renderSection(decodeURIComponent(id));
  if (route === "p") return renderPathPage(parsePathSlug(id));
  if (route === "path") return renderPathPage(parsePathRoute(id));
  if (route === "search") return renderSearch();
  if (route === "map") return renderHome();
  return renderHome();
}

function renderHome() {
  const items = readingItems();
  app.innerHTML = `
    <section class="map-shell">
      <div class="section-title">
        <h1>首頁</h1>
      </div>
      ${renderTree(state.tree)}
    </section>
    <section class="panel">
      <div class="section-title">
        <h2>最新</h2>
      </div>
      <div class="results compact-list">
        ${renderHomeLatest(items)}
      </div>
    </section>
  `;
  wireMapRowLinks();
}

function renderHomeDirectory(items) {
  const leafGroups = groupBy(items, categoryKey);
  return [...leafGroups.entries()]
    .sort(([pathA], [pathB]) => compareHomePath(pathA, pathB))
    .map(([path, records]) => {
      const parts = path.split("/");
      const newest = sortNewest(records)[0];
      const oldest = sortOldest(records)[0];
      return `
        <article class="directory-row">
          <a class="directory-row-main" href="${pathHref(parts)}">
            <strong>${esc(parts.at(-1))}</strong>
            <span class="meta">${esc(displayPathText(parts))} · ${records.length} 筆</span>
          </a>
          <div class="directory-row-actions">
            <a href="${pathHref(parts, { sort: "newest" })}">最新</a>
            <a href="${pathHref(parts, { sort: "oldest" })}">最舊</a>
          </div>
          <a class="directory-row-latest" href="#/article/${esc(newest.id)}">
            <span class="mini-order">${esc(orderLabel(newest))}</span>${esc(newest.title)}
          </a>
          <a class="directory-row-oldest" href="#/article/${esc(oldest.id)}">
            <span class="mini-order">${esc(orderLabel(oldest))}</span>${esc(oldest.title)}
          </a>
        </article>
      `;
    })
    .join("");
}

function compareHomePath(pathA, pathB) {
  const partsA = pathA.split("/");
  const partsB = pathB.split("/");
  const pathCompare = homePathIndex(pathA) - homePathIndex(pathB);
  if (pathCompare !== 0) return pathCompare;
  const sectionCompare = homeSectionIndex(partsA[0]) - homeSectionIndex(partsB[0]);
  if (sectionCompare !== 0) return sectionCompare;
  return pathA.localeCompare(pathB, "zh-Hant");
}

function homeSectionIndex(section) {
  const index = HOME_SECTION_ORDER.indexOf(section);
  return index === -1 ? HOME_SECTION_ORDER.length : index;
}

function homePathIndex(path) {
  const index = HOME_PATH_ORDER.findIndex((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  return index === -1 ? HOME_PATH_ORDER.length : index;
}

function renderHomeLatest(items) {
  const groups = groupBy(items, (item) => pathKey(homeLatestPath(item)));
  return [...groups.entries()]
    .sort(([pathA], [pathB]) => compareHomePath(pathA, pathB))
    .map(([path, records]) => {
      const groupPath = path.split("/");
      const item = pickNewestInGroup(records);
      return item ? renderCard(item, { displayPath: groupPath }) : "";
    })
    .filter(Boolean)
    .join("");
}

function homeLatestPath(item) {
  const parts = item.displayPath;
  if (parts[0] === "法師著作") return parts.slice(0, 2);
  if (parts[0] === "感應故事") return parts.slice(0, 2);
  if (parts[0] === "淨土文庫") return parts.slice(0, 2);
  return parts.slice(0, Math.min(2, parts.length));
}

function pickNewestInGroup(items) {
  return [...items].sort((a, b) => {
    const fixedCompare = compareFixedCategoryOrder(a, b);
    if (fixedCompare !== 0) return fixedCompare;
    const orderA = Number(a.sourceOrder || 0);
    const orderB = Number(b.sourceOrder || 0);
    if (orderA !== orderB) return orderB - orderA;
    const pathCompare = categoryKey(a).localeCompare(categoryKey(b), "zh-Hant");
    if (pathCompare !== 0) return pathCompare;
    return a.title.localeCompare(b.title, "zh-Hant");
  })[0];
}

function renderSection(section) {
  const items = sortNewest(readingItems().filter((item) => item.displayPath[0] === section));
  const childGroups = groupBy(items, (item) => item.displayPath[1] || "未分類");
  if (childGroups.size) return renderPathOverview([section], childGroups, items, displayLabel(section));
  app.innerHTML = `
    ${renderCrumbs([section])}
    <section class="hero">
      <h1>${esc(displayLabel(section))}</h1>
    </section>
    <section class="panel">
      <strong>快速定位</strong>
      <div class="chip-row">
        ${[...childGroups.entries()].map(([name, group]) => `<a class="chip" href="${pathHref([section, name])}">${esc(name)} ${group.length}</a>`).join("")}
      </div>
    </section>
    <section class="results">
      ${items.map(renderCard).join("") || `<div class="empty">尚無內容。</div>`}
    </section>
  `;
}

function renderPathPage(parts) {
  if (parts.length === 0) return renderHome();
  if (parts.length === 1) return renderSection(parts[0]);
  const params = hashParams();
  const sort = params.get("sort") || "newest";
  const limit = Math.max(DIRECTORY_PAGE_SIZE, Number(params.get("limit")) || DIRECTORY_PAGE_SIZE);
  const items = readingItems().filter((item) => pathMatches(item, parts));
  const title = displayPathLeaf(parts);
  const childGroups = groupBy(
    items.filter((item) => item.displayPath.length > parts.length),
    (item) => item.displayPath[parts.length]
  );
  const exactItems = items.filter((item) => item.displayPath.length === parts.length);
  const shouldRenderDirectList =
    !exactItems.length &&
    childGroups.size === 1 &&
    items.every((item) => item.displayPath.length === parts.length + 1);
  if (childGroups.size && !shouldRenderDirectList) return renderPathOverview(parts, childGroups, items, title);
  const baseList = exactItems.length ? exactItems : items;
  const sortedItems = sortByMode(baseList, sort);
  const visibleItems = sortedItems.slice(0, limit);
  app.innerHTML = `
    ${renderCrumbs(parts)}
    <section class="hero">
      <h1>${esc(title)}</h1>
    </section>
    ${renderDirectoryBar(parts, childGroups, baseList, sort, visibleItems.length)}
    ${renderSeriesPanel(parts, baseList)}
    <section class="results compact-list" data-directory-list>
      ${visibleItems.map((item, index) => renderCard(item, { listIndex: index + 1 })).join("") || `<div class="empty">這個層級目前沒有內容。</div>`}
      ${sortedItems.length > visibleItems.length ? `<p class="more-row"><a class="chip" href="${pathHref(parts, { sort, limit: limit + DIRECTORY_PAGE_SIZE })}">顯示更多</a></p>` : ""}
    </section>
  `;
  wireDirectoryControls(baseList, visibleItems);
}

function renderPathOverview(parts, childGroups, items, title) {
  const childEntries = sortPathChildEntries(parts, visibleChildEntries(parts, items));
  app.innerHTML = `
    ${renderCrumbs(parts)}
    <section class="hero compact-hero">
      <h1>${esc(title)}</h1>
    </section>
    <section class="panel">
      <div class="category-grid">
        ${childEntries.map(([childParts, group]) => renderCategoryTile(childParts, group)).join("")}
      </div>
    </section>
    <section class="panel">
      <div class="section-title">
        <h2>最新</h2>
      </div>
      <div class="results compact-list">
        ${childEntries.map(([childParts, group]) => {
          const item = pickNewestInGroup(group);
          return item ? renderCard(item, { displayPath: childParts }) : "";
        }).join("") || `<div class="empty">這個層級目前沒有內容。</div>`}
      </div>
    </section>
  `;
}

function renderCategoryTile(parts, group) {
  return `
    <a class="category-tile" href="${pathHref(parts)}">
      <strong>${esc(displayPathLeaf(parts))}</strong>
      <span>${group.length} 篇</span>
    </a>
  `;
}

function visibleChildEntries(parts, items) {
  const entries = immediateChildEntries(parts, items);
  if (entries.length === 1 && isDisplayOnlyWrapper(entries[0])) {
    const promoted = immediateChildEntries(entries[0].parts, entries[0].group);
    if (promoted.length) return collapseVisibleEntries(promoted);
  }
  return collapseVisibleEntries(entries);
}

function immediateChildEntries(parts, items) {
  return [...groupBy(
    items.filter((item) => item.displayPath.length > parts.length),
    (item) => item.displayPath[parts.length]
  ).entries()].map(([name, group]) => ({ parts: [...parts, name], group }));
}

function collapseVisibleEntries(entries) {
  return entries.flatMap((entry) => {
    if (isDisplayOnlyWrapper(entry)) {
      return collapseVisibleEntries(immediateChildEntries(entry.parts, entry.group));
    }
    let current = entry;
    while (isSingleChildWrapper(current)) {
      const nextName = nextPathNames(current).at(0);
      current = { parts: [...current.parts, nextName], group: current.group };
    }
    return [[current.parts, current.group]];
  });
}

function isDisplayOnlyWrapper(entry) {
  return COLLAPSE_PATH_WRAPPERS.has(pathKey(entry.parts)) && !hasExactItems(entry) && nextPathNames(entry).length > 1;
}

function isSingleChildWrapper(entry) {
  return COLLAPSE_PATH_WRAPPERS.has(pathKey(entry.parts)) && !hasExactItems(entry) && nextPathNames(entry).length === 1;
}

function hasExactItems(entry) {
  return entry.group.some((item) => item.displayPath.length === entry.parts.length);
}

function nextPathNames(entry) {
  return [...new Set(
    entry.group
      .filter((item) => item.displayPath.length > entry.parts.length)
      .map((item) => item.displayPath[entry.parts.length])
      .filter(Boolean)
  )];
}

function sortPathChildEntries(parts, entries) {
  return entries.sort(([partsA], [partsB]) => {
    const nameA = partsA.at(-1);
    const nameB = partsB.at(-1);
    const fixedCompare = compareFixedPathOrder(partsA, partsB);
    if (fixedCompare !== 0) return fixedCompare;
    if (parts[0] === "法師著作" && parts.length === 2) {
      const orderA = titleOrder(nameA, AUTHOR_CATEGORY_ORDER);
      const orderB = titleOrder(nameB, AUTHOR_CATEGORY_ORDER);
      if (orderA !== orderB) return orderA - orderB;
    }
    const pathCompare = compareHomePath(partsA.join("/"), partsB.join("/"));
    if (pathCompare !== 0) return pathCompare;
    return displayLabel(nameA).localeCompare(displayLabel(nameB), "zh-Hant");
  });
}

function compareFixedPathOrder(partsA, partsB) {
  if (partsA.slice(0, -1).join("/") !== partsB.slice(0, -1).join("/")) return 0;
  const fixedA = PATH_DISPLAY_ORDER.get(partsA.join("/"));
  const fixedB = PATH_DISPLAY_ORDER.get(partsB.join("/"));
  if (fixedA != null && fixedB != null) return fixedA - fixedB;
  if (fixedA != null) return -1;
  if (fixedB != null) return 1;
  return 0;
}

function renderDirectoryBar(parts, childGroups, items, sort, visibleCount) {
  return `
    <section class="panel directory-bar">
      <span class="meta">共 ${items.length} 篇，顯示 ${Math.min(visibleCount, items.length)} 篇</span>
      <span class="meta" data-list-progress>目前 1 / ${Math.max(visibleCount, 1)}</span>
      <span class="spacer"></span>
      ${renderJumpForm(items)}
    </section>
  `;
}

function renderJumpForm(items) {
  if (!items.some((item) => item.sourceOrder)) return "";
  return `
    <form class="jump-form" data-jump-number>
      <label>
        跳到 #
        <input name="order" type="search" inputmode="numeric" pattern="[0-9]*" aria-label="輸入文章編號" />
      </label>
      <button>前往</button>
    </form>
  `;
}

function wireDirectoryControls(allItems, visibleItems) {
  const jumpForm = app.querySelector("[data-jump-number]");
  if (jumpForm) {
    jumpForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = new FormData(jumpForm).get("order");
      const target = allItems.find((item) => Number(item.sourceOrder) === Number(value));
      if (target) {
        location.hash = `#/article/${target.id}`;
      } else {
        showToast("找不到這個編號");
      }
    });
  }
  const progress = app.querySelector("[data-list-progress]");
  const cards = [...app.querySelectorAll("[data-list-index]")];
  if (!progress || !cards.length) return;
  if (!("IntersectionObserver" in window)) {
    progress.textContent = `目前 1 / ${visibleItems.length}`;
    return;
  }
  const visible = new Set();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const index = Number(entry.target.dataset.listIndex);
      if (entry.isIntersecting) visible.add(index);
      else visible.delete(index);
    }
    const current = Math.min(...(visible.size ? [...visible] : [1]));
    progress.textContent = `目前 ${current} / ${visibleItems.length}`;
  }, { rootMargin: "-20% 0px -65% 0px", threshold: 0 });
  cards.forEach((card) => observer.observe(card));
}

function renderSeriesPanel(parts, items) {
  const groups = groupBy(items.filter((item) => item.series), (item) => item.series.id);
  if (!groups.size) return "";
  const entries = [...groups.entries()]
    .map(([id, group]) => ({ id, group, series: group[0].series, newest: pickNewestInGroup(group) }))
    .sort((a, b) => {
      const orderA = Number(a.newest?.sourceOrder || 0);
      const orderB = Number(b.newest?.sourceOrder || 0);
      if (orderA !== orderB) return orderB - orderA;
      return a.series.title.localeCompare(b.series.title, "zh-Hant", { numeric: true });
    });
  return `
    <section class="panel series-panel">
      <div class="section-title">
        <h2>系列</h2>
        <span class="meta">${entries.length} 組</span>
      </div>
      <div class="series-grid">
        ${entries.map(({ group, series }) => `
          <a class="series-tile" href="${searchHref({ q: series.title, pathScope: parts })}">
            <strong>${esc(series.title)}</strong>
            <span>${group.length} 篇</span>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function siblingPaths(parts) {
  if (parts.length === 0) return [];
  const parent = parts.slice(0, -1);
  const seen = new Map();
  for (const item of readingItems()) {
    if (!pathMatches(item, parent) || item.displayPath.length < parts.length) continue;
    const sibling = item.displayPath.slice(0, parts.length);
    seen.set(pathKey(sibling), sibling);
  }
  return [...seen.values()].filter((sibling) => pathKey(sibling) !== pathKey(parts));
}

function renderCrumbs(parts, options = {}) {
  const trailing = options.trailing ? `<span class="crumb-trailing">${options.trailing}</span>` : "";
  const entries = displayPathEntries(parts);
  return `
    <div class="crumbs">
      <a href="#/">首頁</a>
    ${entries.map((entry) => `<span>/</span><a href="${pathHref(entry.hrefParts)}">${esc(entry.label)}</a>`).join("")}
    ${trailing}
    </div>
  `;
}

function renderAuthorWorks(section, items) {
  const byAuthor = groupBy(items, (item) => item.displayPath[1] || item.author || "未分類");
  app.innerHTML = `
    ${renderCrumbs([section])}
    <section class="hero">
      <h1>${esc(displayLabel(section))}</h1>
      <p>慧淨法師與淨宗法師分開排列；每組內預設新到舊，方便依作者與作品類型定位。</p>
    </section>
    ${[...byAuthor.entries()]
      .map(([author, records]) => {
        const kindGroups = groupBy(sortNewest(records), (item) => item.displayPath.slice(2).join(" / ") || item.kindLabel);
        return `
          <section class="panel author-group">
            <div class="section-title">
              <h2><a href="${pathHref([section, author])}">${esc(author)}</a></h2>
              <span class="meta">${records.length} 筆，預設新到舊</span>
            </div>
            ${[...kindGroups.entries()]
              .map(
                ([kind, group]) => `
                  <div class="subsection">
                    <h3><a href="${pathHref([section, author, ...kind.split(" / ")])}">${esc(kind)}</a></h3>
                    <div class="results compact-list">${sortNewest(group).map(renderCard).join("")}</div>
                  </div>
                `
              )
              .join("")}
          </section>
        `;
      })
      .join("")}
  `;
}

function renderStorySection(section, items) {
  const byType = groupBy(items, (item) => item.displayPath[1] || item.kindLabel);
  app.innerHTML = `
    ${renderCrumbs([section])}
    <section class="hero">
      <h1>${esc(displayLabel(section))}</h1>
      <p>念佛往生、念佛感應、因果感應故事分開排列；每組用原站序號新到舊排序。</p>
    </section>
    ${[...byType.entries()]
      .map(
        ([type, records]) => `
          <section class="panel author-group">
            <div class="section-title">
              <h2><a href="${pathHref([section, type])}">${esc(type)}</a></h2>
              <span class="meta">${records.length} 筆，序號大者較新</span>
            </div>
            <div class="results compact-list">${sortNewest(records).map(renderCard).join("")}</div>
          </section>
        `
      )
      .join("")}
  `;
}

async function renderSearch() {
  const token = state.renderToken;
  const params = hashParams();
  const q = params.get("q") || "";
  const section = params.get("section") || "all";
  const pathScope = params.get("scope") ? parsePathSlug(params.get("scope")) : params.get("path") ? parsePathRoute(params.get("path")) : [];
  const effectiveSection = pathScope[0] || section;
  if (!q.trim()) {
    renderSearchPage({ q, pathScope, results: [], pending: false, emptySearch: true });
    return;
  }
  const initialResults = quickSearch(q, effectiveSection, pathScope);
  renderSearchPage({ q, pathScope, results: initialResults, pending: true });
  await searchProgressively({ q, section: effectiveSection, pathScope, initialResults, token });
}

function renderSearchPage({ q, pathScope, results, pending, emptySearch = false }) {
  const visibleResults = results.slice(0, INITIAL_SEARCH_RENDER_SIZE);
  const countText = pending ? "搜尋中" : `共 ${results.length} 筆`;
  app.innerHTML = `
    <div class="crumbs search-summary">
      <a href="#/">首頁</a>
      <span>/</span>
      <span>搜尋</span>
      ${q ? `<span>${esc(q)}</span>` : ""}
      ${pathScope.length ? `<span>/</span><a href="${pathHref(pathScope)}">${esc(displayPathText(pathScope))}</a>` : ""}
      ${emptySearch ? "" : `<span>/</span><span>${esc(countText)}</span>`}
    </div>
    <section class="results" data-progressive-results aria-live="polite">
      ${emptySearch ? `<div class="empty">請輸入關鍵字搜尋。</div>` : visibleResults.map(renderCard).join("") || `<div class="empty">沒有符合的內容。</div>`}
    </section>
  `;
  if (emptySearch) return;
  renderSearchResultsInBackground(results, visibleResults.length);
}

function searchHref({ q, section, pathScope = [], limit }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (section && section !== "all") params.set("section", section);
  if (pathScope.length) {
    const scope = pathSlug(pathScope);
    if (scope) params.set("scope", scope);
    else params.set("path", pathKey(pathScope));
  }
  if (limit) params.set("limit", String(limit));
  return `#/search?${params.toString()}`;
}

async function searchProgressively({ q, section, pathScope, initialResults, token }) {
  const manifest = await loadSearchManifest();
  if (token !== state.renderToken) return;
  if (!manifest?.chunks?.length) {
    renderSearchPage({ q, pathScope, results: initialResults, pending: false });
    return;
  }

  const chunks = manifest.chunks.filter((chunk) => section === "all" || chunk.section === section);
  const found = new Map(initialResults.map((item) => [item.id, item]));
  for (let index = 0; index < chunks.length; index += 1) {
    const records = await loadSearchChunk(chunks[index]);
    if (token !== state.renderToken) return;
    for (const item of searchRecords(q, section, pathScope, records)) {
      const record = byId(item.id);
      if (record) found.set(record.id, record);
    }
    renderSearchPage({
      q,
      pathScope,
      results: sortNewest([...found.values()]),
      pending: index < chunks.length - 1
    });
    await idlePromise();
  }
}

function searchRecords(q, section, pathScope = [], records = []) {
  const terms = q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return records.filter((item) => {
    const record = byId(item.id);
    if (!record) return false;
    if (pathScope.length && !pathMatches(record, pathScope)) return false;
    if (section !== "all" && record.displayPath[0] !== section) return false;
    const haystack = [
      item.title,
      item.author,
      item.kind,
      item.categoryPath,
      displayPathText(record.displayPath),
      (item.tags || []).join(" "),
      item.excerpt,
      item.text
    ]
      .join(" ")
      .toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function quickSearch(q, section, pathScope = []) {
  const terms = q.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return sortNewest(readingItems().filter((item) => {
    if (pathScope.length && !pathMatches(item, pathScope)) return false;
    if (section !== "all" && item.displayPath[0] !== section) return false;
    const haystack = [
      item.title,
      item.author,
      item.kindLabel,
      item.displayPath.join(" "),
      displayPathText(item.displayPath),
      (item.tags || []).join(" "),
      item.excerpt
    ]
      .join(" ")
      .toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  }));
}

function renderSearchResultsInBackground(items, startIndex) {
  const container = app.querySelector("[data-progressive-results]");
  if (!container || startIndex >= items.length) return;
  const token = state.renderToken;
  let index = startIndex;
  const appendBatch = (deadline) => {
    if (token !== state.renderToken || !container.isConnected) return;
    let html = "";
    let count = 0;
    while (
      index < items.length &&
      count < BACKGROUND_SEARCH_BATCH_SIZE &&
      (!deadline?.timeRemaining || deadline.timeRemaining() > 4 || count < 4)
    ) {
      html += renderCard(items[index]);
      index += 1;
      count += 1;
    }
    if (html) container.insertAdjacentHTML("beforeend", html);
    if (index < items.length) scheduleIdle(appendBatch);
  };
  scheduleIdle(appendBatch);
}

function scheduleIdle(callback) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 250 });
    return;
  }
  window.setTimeout(() => callback(), 40);
}

function idlePromise() {
  return new Promise((resolve) => scheduleIdle(resolve));
}

function renderMap() {
  app.innerHTML = `
    <div class="crumbs"><a href="#/">首頁</a></div>
    <section class="map-shell">
      <div class="section-title">
        <h2>首頁</h2>
      </div>
      ${renderTree(state.tree)}
    </section>
    <section class="panel">
      <div class="section-title">
        <h2>最新</h2>
      </div>
      <div class="results compact-list">
        ${renderHomeLatest(readingItems())}
      </div>
    </section>
  `;
  wireMapRowLinks();
}

function renderTree(nodes, depth = 1) {
  const pathNodes = mapDisplayNodes(nodes, depth).sort(compareMapNodes);
  if (!pathNodes.length) return "";
  return `<ul class="${depth === 1 ? "map-root" : "map-branch"}">${pathNodes
    .map(
      (node) => {
        const childDepth = node.promotedFromHiddenParent ? depth + 2 : depth + 1;
        const href = nodePathHref(node);
        const parts = mapNodeParts(node);
        const shouldShowChildren = depth < 3 && !HOME_COLLAPSED_PATHS.has(parts.join("/"));
        const children = shouldShowChildren ? renderTree(node.children || [], childDepth) : "";
        const hiddenChildCount = shouldShowChildren ? 0 : pathChildCount(node);
        const count = countPathItems(node);
        return `
        <li${href ? ` data-map-row-href="${esc(href)}" tabindex="0" role="link"` : ""}>
          ${href ? `<a class="tree-link" href="${esc(href)}">${esc(displayPathLeaf(parts))}</a>` : `<strong>${esc(displayPathLeaf(parts))}</strong>`}
          ${count ? `<span class="meta"> ${count} 篇</span>` : ""}
          ${hiddenChildCount ? `<span class="meta child-summary">另有 ${hiddenChildCount} 類</span>` : ""}
          ${children}
        </li>
      `;
      }
    )
    .join("")}</ul>`;
}

function pathChildCount(node) {
  return (node.children || []).filter((child) => child.type === "path").length;
}

function wireMapRowLinks() {
  app.querySelectorAll("[data-map-row-href]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, select, textarea")) return;
      if (hasTextSelectionInside(row)) return;
      event.stopPropagation();
      location.hash = row.dataset.mapRowHref;
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      location.hash = row.dataset.mapRowHref;
    });
  });
}

function hasTextSelectionInside(element) {
  const selection = window.getSelection?.();
  if (!selection || selection.isCollapsed) return false;
  return element.contains(selection.anchorNode) || element.contains(selection.focusNode);
}

function mapDisplayNodes(nodes, depth) {
  const pathNodes = nodes.filter((node) => node.type === "path");
  if (depth !== 1) return collapseMapDisplayNodes(pathNodes);
  return pathNodes.flatMap((node) => {
    if (node.title !== "法師著作") return [node];
    return (node.children || [])
      .filter((child) => child.type === "path")
      .map((child) => ({ ...child, promotedFromHiddenParent: true }));
  });
}

function collapseMapDisplayNodes(nodes) {
  if (nodes.length === 1 && isMapDisplayOnlyWrapper(nodes[0])) {
    const promoted = mapPathChildren(nodes[0]);
    if (promoted.length) return collapseMapDisplayNodes(promoted);
  }
  return nodes.flatMap((node) => {
    if (isMapDisplayOnlyWrapper(node)) {
      return collapseMapDisplayNodes(mapPathChildren(node));
    }
    return [collapseMapNode(node)];
  });
}

function collapseMapNode(node) {
  let current = node;
  while (isMapSingleChildWrapper(current)) {
    const child = mapPathChildren(current)[0];
    current = { ...child, promotedFromHiddenParent: current.promotedFromHiddenParent };
  }
  return current;
}

function isMapDisplayOnlyWrapper(node) {
  return COLLAPSE_PATH_WRAPPERS.has(pathKey(mapNodeParts(node))) && mapPageChildren(node).length === 0 && mapPathChildren(node).length > 1;
}

function isMapSingleChildWrapper(node) {
  return COLLAPSE_PATH_WRAPPERS.has(pathKey(mapNodeParts(node))) && mapPageChildren(node).length === 0 && mapPathChildren(node).length === 1;
}

function mapPathChildren(node) {
  return (node.children || []).filter((child) => child.type === "path");
}

function mapPageChildren(node) {
  return (node.children || []).filter((child) => child.type !== "path");
}

function compareMapNodes(a, b) {
  const partsA = mapNodeParts(a);
  const partsB = mapNodeParts(b);
  const parentA = partsA.slice(0, -1).join("/");
  const parentB = partsB.slice(0, -1).join("/");
  if (parentA === parentB) {
    const fixedA = PATH_DISPLAY_ORDER.get(partsA.join("/"));
    const fixedB = PATH_DISPLAY_ORDER.get(partsB.join("/"));
    if (fixedA != null && fixedB != null) return fixedA - fixedB;
    if (fixedA != null) return -1;
    if (fixedB != null) return 1;
  }
  if (parentA === parentB && partsA[0] === "法師著作" && partsA.length === 3) {
    const orderA = titleOrder(partsA[2], AUTHOR_CATEGORY_ORDER);
    const orderB = titleOrder(partsB[2], AUTHOR_CATEGORY_ORDER);
    if (orderA !== orderB) return orderA - orderB;
  }
  const homeCompare = compareHomePath(partsA.join("/"), partsB.join("/"));
  if (homeCompare !== 0) return homeCompare;
  return displayLabel(a.title).localeCompare(displayLabel(b.title), "zh-Hant");
}

function mapNodeParts(node) {
  if (node.href?.startsWith("#/p/")) {
    return parsePathSlug(node.href.replace("#/p/", "").split("?")[0]);
  }
  if (node.href?.startsWith("#/path/")) {
    return decodeURIComponent(node.href.replace("#/path/", "").split("?")[0]).split("/").filter(Boolean);
  }
  return [node.title];
}

function nodePathHref(node) {
  const parts = mapNodeParts(node);
  return parts.length ? pathHref(parts) : node.href;
}

function titleOrder(title, order) {
  const index = order.indexOf(title);
  return index === -1 ? order.length : index;
}

function buildPathDisplayOrder(groups) {
  return new Map(groups.flatMap(([parent, names]) => names.map((name, index) => [`${parent}/${name}`, index])));
}

function countPathItems(node) {
  const parts = mapNodeParts(node);
  return readingItems().filter((item) => pathMatches(item, parts)).length;
}

async function renderArticle(id) {
  const indexedArticle = byId(id);
  if (!indexedArticle) {
    app.innerHTML = `<div class="empty">找不到文章。</div>`;
    return;
  }
  app.innerHTML = `<section class="loading"><h1>載入文章</h1><p>${esc(indexedArticle.title)}</p></section>`;
  const article = await loadArticle(id);
  if (!article) {
    app.innerHTML = `<div class="empty">找不到文章。</div>`;
    return;
  }
  const siblings = state.articles.filter(
    (item) => item.displayPath.slice(0, -1).join("/") === article.displayPath.slice(0, -1).join("/")
  );
  const articleBodyHtml = prepareArticleBodyHtml(article);
  app.innerHTML = `
    <article class="article-shell article">
      ${renderCrumbs(article.displayPath, { trailing: article.sourceOrder ? `<span class="path-order">${esc(orderLabel(article))}</span>` : "" })}
      <div data-article-tools></div>
      <h1>${esc(article.title)}</h1>
      ${article.series ? `<p class="meta">系列：<a href="#/search?q=${encodeURIComponent(article.series.title)}&section=${encodeURIComponent(article.displayPath[0])}">${esc(article.series.title)}</a>${article.series.partLabel ? ` · 第 ${esc(article.series.partLabel)} 篇` : ""}</p>` : ""}
      ${article.attachments.length ? renderAttachments(article) : ""}
      <div class="article-body">${articleBodyHtml}</div>
      ${renderRelated(article)}
    </article>
  `;
  renderDirectoryDrawer(article, siblings);
  wireArticleActions(article);
  scaleArticleInlineFontSizes(app);
  prepareArticleDarkThemeStyles(app);
}

function renderRelated(article) {
  const blocks = [
    ["同系列", article.related?.sameSeries || []],
    ["同作者", article.related?.sameAuthor || []],
    ["同分類", article.related?.sameCategory || []],
    ["相近主題", article.related?.sameTopic || []]
  ]
    .map(([label, ids]) => {
      const items = ids.map(byId).filter(Boolean).slice(0, 6);
      if (!items.length) return "";
      return `
        <section class="panel related-block">
          <h2>${esc(label)}</h2>
          <div class="results">${items.map(renderCard).join("")}</div>
        </section>
      `;
    })
    .join("");
  return blocks ? `<section class="related"><h2>延伸閱讀</h2>${blocks}</section>` : "";
}

function renderAttachments(article) {
  return `
    <section class="panel">
      <strong>原站附件</strong>
      <div class="actions">
        ${article.attachments.map((file) => `<a href="${esc(file.url)}" target="_blank" rel="noreferrer">${esc(file.label)}</a>`).join("")}
      </div>
    </section>
  `;
}

function renderCard(item, options = {}) {
  const listIndex = typeof options === "object" ? options.listIndex : null;
  const displayPath = options.displayPath || item.displayPath;
  const order = item.sourceOrder ? `<span class="path-order">${esc(orderLabel(item))}</span>` : "";
  return `
    <div class="card article-card"${listIndex ? ` data-list-index="${listIndex}"` : ""}>
      <span class="meta path-links">${renderPathLinks(displayPath)}${order ? ` ${order}` : ""}</span>
      <span class="card-head">
        <strong class="selectable-title">${esc(item.title)}</strong>
      </span>
      ${item.series ? `<span class="meta">系列：<a href="#/search?q=${encodeURIComponent(item.series.title)}&section=${encodeURIComponent(item.displayPath[0])}">${esc(item.series.title)}</a></span>` : ""}
      <span>${esc(item.excerpt)}</span>
      <span class="card-actions"><a href="#/article/${item.id}">閱讀</a></span>
    </div>
  `;
}

function renderPathLinks(parts) {
  return displayPathEntries(parts)
    .map((entry) => `<a href="${pathHref(entry.hrefParts)}">${esc(entry.label)}</a>`)
    .join(" / ");
}

function sectionSummary(section, items) {
  if (section === "法師著作") {
    const counts = groupBy(items, (item) => item.displayPath[1] || item.author || "未分類");
    return [...counts.entries()].map(([name, records]) => `${esc(name)} ${records.length}`).join("、");
  }
  if (section === "感應故事") {
    const counts = groupBy(items, (item) => item.displayPath[1] || "未分類");
    return [...counts.entries()].map(([name, records]) => `${esc(name)} ${records.length}`).join("、");
  }
  return esc(sortNewest(items).slice(0, 3).map((item) => item.title).join("、"));
}

function wireArticleActions(article) {
  const navTemplate = document.querySelector("#article-nav-template");
  const navActions = navTemplate.content.cloneNode(true);
  const navHolder = document.querySelector("[data-header-article-nav]");
  if (navHolder) {
    navHolder.replaceChildren(navActions);
    navHolder.hidden = false;
    syncStickyHeaderHeight();
  }

  const toolsTemplate = document.querySelector("#article-tools-template");
  const tools = toolsTemplate.content.cloneNode(true);
  const toolsHolder = app.querySelector("[data-article-tools]");
  toolsHolder.append(tools);

  if (navHolder) {
    navHolder.querySelector("[data-action='up']").addEventListener("click", () => {
      location.hash = pathHref(article.displayPath.slice(0, -1));
    });
    navHolder.querySelector("[data-action='prev']").disabled = !article.prevId;
    navHolder.querySelector("[data-action='prev']").addEventListener("click", () => {
      if (article.prevId) location.hash = `#/article/${article.prevId}`;
    });
    navHolder.querySelector("[data-action='next']").disabled = !article.nextId;
    navHolder.querySelector("[data-action='next']").addEventListener("click", () => {
      if (article.nextId) location.hash = `#/article/${article.nextId}`;
    });
  }
  toolsHolder.querySelector("[data-action='copy-text']").addEventListener("click", () => copy(plainTextForCopy(article)));
  toolsHolder.querySelector("[data-action='copy-md']").addEventListener("click", () => copy(markdownForCopy(article)));
}

function plainTextForCopy(article) {
  const renderedText = app.querySelector(".article-body")?.innerText?.trim() || "";
  const text = renderedText || article.bodyText?.trim() || htmlToPlainText(prepareArticleBodyHtml(article));
  if (text) return text;
  const images = [...String(article.bodyHtml || "").matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/gi)]
    .map((matchResult) => matchResult[1])
    .filter(Boolean);
  return [
    article.title,
    article.displayPath?.length ? article.displayPath.join(" / ") : "",
    article.sourceUrl ? `來源：${article.sourceUrl}` : "",
    "",
    "原站此頁主要為圖片或尚無可轉換文字。",
    ...images.map((src) => `圖片：${src}`)
  ].filter((line, index) => index < 3 ? Boolean(line) : true).join("\n");
}

function htmlToPlainText(html) {
  const container = document.createElement("div");
  container.innerHTML = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|h5|h6|li|div)>/gi, "\n");
  return container.textContent
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function markdownForCopy(article) {
  const body = htmlToMarkdown(prepareArticleBodyHtml(article));
  return [
    `# ${article.title}`,
    "",
    article.displayPath?.length ? `路徑：${displayPathText(article.displayPath)}` : "",
    article.sourceUrl ? `來源：${article.sourceUrl}` : "",
    "",
    body || plainTextForCopy(article)
  ].filter(Boolean).join("\n");
}

function prepareArticleBodyHtml(article) {
  const container = document.createElement("div");
  container.innerHTML = article.bodyHtml || "";
  container.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    if (!normalizedNodeText(heading)) heading.remove();
  });

  const firstHeading = container.querySelector("h1, h2, h3, h4, h5, h6");
  if (firstHeading && isLeadingNode(container, firstHeading) && sameDisplayText(firstHeading.textContent, article.title)) {
    firstHeading.remove();
  }

  return container.innerHTML;
}

function isLeadingNode(root, target) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node === target) return true;
    if (node.nodeType === Node.TEXT_NODE && normalizedText(node.nodeValue)) return false;
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName?.toLowerCase() === "img") return false;
  }
  return false;
}

function sameDisplayText(left = "", right = "") {
  return normalizeComparableText(left) === normalizeComparableText(right);
}

function normalizeComparableText(value = "") {
  return normalizedText(value)
    .replace(/^[#\d.．、\s]+/, "")
    .replace(/\s+/g, "")
    .trim();
}

function normalizedNodeText(node) {
  return normalizedText(node.textContent || "");
}

function normalizedText(value = "") {
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToMarkdown(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  return markdownChildren(container)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function markdownChildren(node) {
  return [...node.childNodes].map(markdownNode).join("");
}

function markdownNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const tag = node.tagName.toLowerCase();
  const text = markdownChildren(node);
  const trimmed = text.trim();
  if (tag === "br") return "\n";
  if (tag === "img") {
    const alt = node.getAttribute("alt") || "圖片";
    const src = node.getAttribute("src") || "";
    return src ? `\n![${alt}](${src})\n` : "";
  }
  if (tag === "a") {
    const href = node.getAttribute("href") || "";
    return href && trimmed ? `[${trimmed}](${href})` : text;
  }
  if (tag === "strong" || tag === "b") return trimmed ? `**${trimmed}**` : text;
  if (tag === "em" || tag === "i") return trimmed ? `*${trimmed}*` : text;
  if (tag === "u") return trimmed ? `<u>${trimmed}</u>` : text;
  if (tag === "sub" || tag === "sup") return trimmed ? `<${tag}>${trimmed}</${tag}>` : text;
  if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${trimmed}\n\n`;
  if (tag === "li") return trimmed ? `- ${trimmed}\n` : "";
  if (["p", "div", "section", "blockquote"].includes(tag)) return trimmed ? `${trimmed}\n\n` : "";
  if (tag === "tr") return `${[...node.children].map((cell) => markdownChildren(cell).trim()).join(" | ")}\n`;
  if (tag === "table") return `\n${trimmed}\n\n`;
  return text;
}

function wireDirectoryDrawer() {
  const toggle = document.querySelector("[data-directory-toggle]");
  const close = document.querySelector("[data-directory-close]");
  toggle.addEventListener("click", () => setDirectoryDrawerOpen(toggle.getAttribute("aria-expanded") !== "true"));
  close.addEventListener("click", () => setDirectoryDrawerOpen(false));
}

function renderDirectoryDrawer(article, siblings) {
  const toggle = document.querySelector("[data-directory-toggle]");
  const list = document.querySelector("[data-directory-list]");
  toggle.hidden = false;
  syncStickyHeaderHeight();
  list.innerHTML = sortNewest(siblings)
    .map((item) => `<li><a class="${item.id === article.id ? "active" : ""}" href="#/article/${item.id}">${item.sourceOrder ? `<span class="mini-order">#${esc(item.sourceOrder)}</span>` : ""}${esc(item.title)}</a></li>`)
    .join("");
}

function resetDirectoryDrawer() {
  const toggle = document.querySelector("[data-directory-toggle]");
  const drawer = document.querySelector("[data-directory-drawer]");
  if (!toggle || !drawer) return;
  toggle.hidden = true;
  setDirectoryDrawerOpen(false);
  syncStickyHeaderHeight();
}

function resetHeaderArticleNav() {
  const navHolder = document.querySelector("[data-header-article-nav]");
  if (!navHolder) return;
  navHolder.replaceChildren();
  navHolder.hidden = true;
  syncStickyHeaderHeight();
}

function setDirectoryDrawerOpen(open) {
  const toggle = document.querySelector("[data-directory-toggle]");
  const drawer = document.querySelector("[data-directory-drawer]");
  if (!toggle || !drawer) return;
  toggle.setAttribute("aria-expanded", String(open));
  drawer.hidden = !open;
}

async function copy(text) {
  await navigator.clipboard.writeText(text);
  showToast("已複製");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 1500);
}

window.addEventListener("hashchange", render);

loadData()
  .then(render)
  .catch((error) => {
    app.innerHTML = `<section class="empty"><h1>資料載入失敗</h1><p>${esc(error.message)}</p></section>`;
  });
