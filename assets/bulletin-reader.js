const INITIAL_BATCH_SIZE = 1;
const BACKGROUND_BATCH_SIZE = 4;
const DEFAULT_ISSUE = null;
const DATA_ROOT = String(window.__PLB_BULLETIN_DATA_ROOT || "./data/bimonthly/").replace(/\/?$/, "/");
const PREFERRED_ID = window.__PLB_BULLETIN_PREFERRED_ID || null;

const state = {
  articles: [],
  batchIndex: [],
  batchLoadedIssues: new Set(),
  batchLoadPromises: new Map(),
  filtered: [],
  selected: new Set(),
  currentId: null,
  renderedCount: 0,
  mode: "reading",
  orientation: "portrait",
  loadToken: 0,
  scrollFrame: null,
};

const elements = {
  header: document.querySelector(".command-bar"),
  feed: document.querySelector("#article-feed"),
  directoryIssue: document.querySelector("#directory-issue"),
  directoryList: document.querySelector("#directory-list"),
  previousIssue: document.querySelector("#previous-issue"),
  nextIssue: document.querySelector("#next-issue"),
  selectedSummary: document.querySelector("#selected-summary"),
  selectedSummaryCount: document.querySelector("#selected-summary-count"),
  selectedSummaryList: document.querySelector("#selected-summary-list"),
  issueFilter: document.querySelector("#issue-filter"),
  categoryFilter: document.querySelector("#category-filter"),
  search: document.querySelector("#article-search"),
  modeControl: document.querySelector("#mode-control"),
  orientationControl: document.querySelector("#orientation-control"),
  printButton: document.querySelector("#print-button"),
  printLabel: document.querySelector("#print-label"),
  pageStyle: document.querySelector("#page-style"),
  loadingStatus: document.querySelector(".feed-loading"),
};

window.__PLB_BULLETIN_CLEANUP?.();
window.__PLB_BULLETIN_CLEANUP = () => {
  state.loadToken += 1;
  window.removeEventListener("scroll", onScroll);
  document.body.classList.remove("reader-body", "printing", "orientation-landscape");
};
document.body.classList.add("reader-body");

function dataUrl(relativePath) {
  return `${DATA_ROOT}${relativePath}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("zh-TW");
}

function pageStyleText(orientation) {
  return `
    @page {
      size: A4 ${orientation};
      margin: 14mm 16mm 20mm;

      @bottom-center {
        content: counter(page);
        color: #6f665f;
        font-family: "GenWanMin2 TC Web", serif;
        font-size: 9pt;
      }
    }
  `;
}

function availableValues(key) {
  const values = state.articles.map((article) => article[key]).filter(Boolean);
  if (key === "issue") values.push(...state.batchIndex.map((item) => item.issue));
  if (key === "category") state.batchIndex.forEach((item) => values.push(...(item.categories ?? [])));
  return [...new Set(values)].sort((first, second) => {
    const compare = String(first).localeCompare(String(second), "zh-TW", { numeric: true });
    return key === "issue" ? -compare : compare;
  });
}

function fillSelect(select, values, label, formatValue = (value) => value) {
  select.innerHTML = `<option value="">${escapeHtml(label)}</option>${values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(formatValue(value))}</option>`)
    .join("")}`;
}

function issueOptionLabel(issue) {
  const issueText = /^\d+$/.test(issue) ? issue.padStart(3, "0") : issue;
  const article = state.articles.find((item) => item.issue === issue);
  const batchIssue = state.batchIndex.find((item) => item.issue === issue);
  const publicationDate = article?.publicationDate ?? batchIssue?.publicationDate ?? "";
  const year = Number(publicationDate.slice(0, 4));
  const month = Number(publicationDate.slice(5, 7));
  const rocYear = year - 1911;
  const dateText = rocYear > 0 && month > 0 ? `　${rocYear}/${month}月` : "";
  return `第 ${issueText} 期${dateText}`;
}

function populateFilters() {
  const issueValue = elements.issueFilter.value;
  const categoryValue = elements.categoryFilter.value;
  const issues = availableValues("issue");
  const categories = availableValues("category");
  fillSelect(elements.issueFilter, issues, "全部", issueOptionLabel);
  fillSelect(elements.categoryFilter, categories, "全部");
  if (issues.includes(issueValue)) elements.issueFilter.value = issueValue;
  if (categories.includes(categoryValue)) elements.categoryFilter.value = categoryValue;
}

function articleMatchesFilters(article) {
  const keyword = normalizeSearchText(elements.search.value.trim());
  return (
    (!elements.issueFilter.value || article.issue === elements.issueFilter.value) &&
    (!elements.categoryFilter.value || article.category === elements.categoryFilter.value) &&
    (!keyword || article.searchText.includes(keyword))
  );
}

function hydrateArticle(article) {
  const publicationDate = article.publicationDate ?? article.date ?? "";
  return {
    ...article,
    publicationDate,
    publicationYear: Number(publicationDate.slice(0, 4)) || null,
    publicationMonth: publicationDate.slice(5, 7),
    searchText: normalizeSearchText(
      [article.issue, article.title, article.category, article.author, publicationDate, article.html].join(" "),
    ),
  };
}

function mergeArticles(incoming) {
  const byId = new Map(state.articles.map((article) => [article.id, article]));
  for (const article of incoming ?? []) {
    if (!article?.id || byId.has(article.id)) continue;
    byId.set(article.id, hydrateArticle(article));
  }
  state.articles = [...byId.values()].sort((first, second) =>
    second.issue.localeCompare(first.issue, "zh-TW", { numeric: true }),
  );
}

async function loadBatchIndex() {
  try {
    const response = await fetch(dataUrl("index.json"));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.batchIndex = Array.isArray(payload.issues) ? payload.issues : [];
    populateFilters();
    return state.batchIndex;
  } catch (error) {
    console.warn("批次文章索引載入失敗，先使用正式文章資料。", error);
    state.batchIndex = [];
    return [];
  }
}

async function loadBatchIssue(issue) {
  if (!issue || state.batchLoadedIssues.has(issue)) return true;
  if (state.batchLoadPromises.has(issue)) return state.batchLoadPromises.get(issue);
  const entry = state.batchIndex.find((item) => item.issue === issue);
  if (!entry) return false;
  const promise = fetch(dataUrl(`issues/${entry.file}`))
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      mergeArticles(payload.articles);
      state.batchLoadedIssues.add(issue);
      populateFilters();
      return true;
    })
    .catch((error) => {
      console.warn(`第 ${issue} 期批次文章載入失敗。`, error);
      return false;
    })
    .finally(() => state.batchLoadPromises.delete(issue));
  state.batchLoadPromises.set(issue, promise);
  return promise;
}

async function loadAllBatchIssues() {
  for (const entry of state.batchIndex) await loadBatchIssue(entry.issue);
}

function scheduleBatchBackgroundLoad() {
  let index = 0;
  const loadNext = async () => {
    while (index < state.batchIndex.length && state.batchLoadedIssues.has(state.batchIndex[index].issue)) index += 1;
    if (index >= state.batchIndex.length) return;
    const issue = state.batchIndex[index].issue;
    index += 1;
    await loadBatchIssue(issue);
    // Keep the first screen responsive while the rest of the archive arrives.
    window.setTimeout(loadNext, 350);
  };
  window.setTimeout(loadNext, 800);
}

async function handleFiltersChanged() {
  const needsAll = Boolean(elements.categoryFilter.value || elements.search.value.trim());
  if (needsAll) await loadAllBatchIssues();
  else if (elements.issueFilter.value) await loadBatchIssue(elements.issueFilter.value);
  applyFilters();
}

function articleTemplate(article, options = {}) {
  const selected = state.selected.has(article.id);
  const classNames = [
    "print-article",
    `source-${article.issue}`,
    `mode-${state.mode}`,
    selected && !options.printOnly ? "is-selected" : "",
    article.id === state.currentId && !options.printOnly ? "is-current" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <article class="${classNames}" data-article-id="${escapeHtml(article.id)}" data-issue="${escapeHtml(article.issue)}">
      <div class="article-kicker">
        <span>淨土宗雙月刊　第 ${escapeHtml(article.issue)} 期</span>
        <span>${escapeHtml(article.category)}</span>
      </div>
      <div class="article-content">${article.html}</div>
    </article>`;
}

function updateLoadingStatus() {
  if (!elements.loadingStatus) return;
  if (!state.filtered.length) {
    elements.loadingStatus.textContent = "沒有符合的文章";
    return;
  }
  elements.loadingStatus.textContent =
    state.renderedCount < state.filtered.length
      ? `已載入 ${state.renderedCount}／${state.filtered.length}，其餘背景載入`
      : `已載入 ${state.filtered.length} 篇`;
}

function appendArticles(count) {
  const nextArticles = state.filtered.slice(state.renderedCount, state.renderedCount + count);
  if (!nextArticles.length) return;
  elements.feed.insertAdjacentHTML("beforeend", nextArticles.map((article) => articleTemplate(article)).join(""));
  state.renderedCount += nextArticles.length;
  updateLoadingStatus();
}

function scheduleBackgroundLoad(token) {
  if (state.renderedCount >= state.filtered.length) return;
  const load = () => {
    if (token !== state.loadToken) return;
    appendArticles(BACKGROUND_BATCH_SIZE);
    scheduleBackgroundLoad(token);
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(load, { timeout: 900 });
  } else {
    window.setTimeout(load, 500);
  }
}

function ensureArticleRendered(id) {
  const index = state.filtered.findIndex((article) => article.id === id);
  if (index < 0) return false;
  if (index >= state.renderedCount) appendArticles(index - state.renderedCount + 1);
  return true;
}

function issueIds() {
  return [...new Set([
    ...state.articles.map((article) => article.issue),
    ...state.batchIndex.map((item) => item.issue),
  ])].sort((a, b) => b.localeCompare(a, "zh-TW", { numeric: true }));
}

function latestIssue() {
  return issueIds()[0] || DEFAULT_ISSUE || "001";
}

function issueJumpTemplate(issue) {
  const articles = state.articles.filter((article) => article.issue === issue);
  const first = articles[0];
  const batchIssue = state.batchIndex.find((item) => item.issue === issue);
  const year = Number((first?.publicationDate ?? first?.date ?? "").slice(0, 4));
  const month = Number((first?.publicationDate ?? first?.date ?? "").slice(5, 7));
  const dateText = year > 1911 && month > 0 ? `${year - 1911}/${month}月` : "";
  const countText = `${articles.length || batchIssue?.recordCount || 0} 篇`;
  return [
    `${issue.padStart(3, "0")} 期`,
    [dateText, countText].filter(Boolean).join(" · "),
  ];
}

function renderIssueJumpList(container, issues) {
  if (!issues.length) {
    container.hidden = true;
    container.replaceChildren();
    return;
  }

  container.hidden = false;
  container.innerHTML = issues
    .map((issue) => {
      const [label, summary] = issueJumpTemplate(issue);
      return `
        <button class="issue-jump" type="button" data-issue="${escapeHtml(issue)}" aria-label="前往第 ${escapeHtml(issue)} 期">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(summary)}</strong>
        </button>`;
    })
    .join("");
}

function updateIssueJumps(currentIssue) {
  const issues = issueIds();
  const currentIndex = issues.indexOf(currentIssue);
  const previous = currentIndex > 0 ? issues.slice(0, currentIndex) : [];
  const next = currentIndex >= 0 ? issues.slice(currentIndex + 1) : [];

  renderIssueJumpList(elements.previousIssue, previous);
  renderIssueJumpList(elements.nextIssue, next);
}

function renderDirectory() {
  const current = state.articles.find((article) => article.id === state.currentId);
  if (!current) {
    elements.directoryIssue.textContent = "沒有符合文章";
    elements.directoryList.innerHTML = '<p class="directory-empty">請調整上方篩選條件。</p>';
    updateIssueJumps("");
    return;
  }

  elements.directoryIssue.textContent = `第 ${current.issue} 期`;
  const sameIssue = state.articles.filter((article) => article.issue === current.issue);
  elements.directoryList.innerHTML = sameIssue
    .map(
      (article) => `
        <div class="directory-item ${article.id === state.currentId ? "is-current" : ""} ${state.selected.has(article.id) ? "is-selected" : ""}" data-id="${escapeHtml(article.id)}">
          <button
            type="button"
            class="directory-title"
            data-directory-id="${escapeHtml(article.id)}"
            aria-pressed="${state.selected.has(article.id)}"
            aria-label="${state.selected.has(article.id) ? "取消列印" : "選取列印"}並前往：${escapeHtml(article.title)}"
          >
            <span class="directory-title-text">${escapeHtml(article.title)}</span>
          </button>
        </div>`,
    )
    .join("");
  updateIssueJumps(current.issue);
}

function renderSelectedSummary() {
  const selectedArticles = state.articles.filter((article) => state.selected.has(article.id));
  elements.selectedSummary.hidden = selectedArticles.length === 0;
  elements.selectedSummaryCount.textContent = selectedArticles.length;
  elements.selectedSummaryList.innerHTML = selectedArticles
    .map(
      (article) => `
        <div class="selected-summary-item">
          <button type="button" class="selected-summary-link" data-selected-scroll-id="${escapeHtml(article.id)}" aria-label="前往：${escapeHtml(article.title)}" title="${escapeHtml(article.title)}">
            <span>${escapeHtml(article.issue.padStart(3, "0"))}</span>
            <span class="selected-summary-title">${escapeHtml(article.title)}</span>
          </button>
          <button type="button" class="selected-summary-remove" data-selected-remove-id="${escapeHtml(article.id)}" aria-label="取消選取：${escapeHtml(article.title)}" title="取消選取">×</button>
        </div>`,
    )
    .join("");
  refreshSelectedSummaryMarquees();
}

function refreshSelectedSummaryMarquees() {
  document.querySelectorAll(".selected-summary-title").forEach((title) => {
    const viewport = title.parentElement;
    if (!viewport) return;
    const measure = title.cloneNode(true);
    measure.removeAttribute("class");
    measure.style.cssText = "position:absolute;left:-9999px;top:-9999px;display:block;width:max-content;max-width:none;white-space:nowrap;font-size:18px;font-weight:400;line-height:1.18;";
    document.body.append(measure);
    const distance = Math.max(0, measure.getBoundingClientRect().width - viewport.clientWidth);
    measure.remove();
    title.classList.toggle("is-marquee", distance > 4);
    title.style.setProperty("--marquee-distance", `${distance}px`);
  });
}

function updateSelectionUi() {
  const count = state.selected.size;
  elements.printLabel.textContent = count ? `列印已選 ${count} 篇` : "列印目前文章";
  elements.printButton.disabled = !count && !state.currentId;

  document.querySelectorAll(".print-article").forEach((element) => {
    const id = element.dataset.articleId;
    const selected = state.selected.has(id);
    element.classList.toggle("is-selected", selected);
  });
  renderSelectedSummary();
}

function toggleArticleSelection(id) {
  if (!id) return;
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);
  renderDirectory();
  updateSelectionUi();
}

function setCurrentArticle(id) {
  if (!id || state.currentId === id) return;
  state.currentId = id;
  document.querySelectorAll(".print-article").forEach((article) => {
    article.classList.toggle("is-current", article.dataset.articleId === id);
  });
  renderDirectory();
  updateSelectionUi();
}

function goToArticle(id, behavior = "smooth") {
  const targetArticle = state.articles.find((article) => article.id === id);
  if (!targetArticle) return;

  if (!state.filtered.some((article) => article.id === id)) {
    elements.issueFilter.value = targetArticle.issue;
    elements.categoryFilter.value = "";
    elements.search.value = "";
    applyFilters(id);
  } else {
    ensureArticleRendered(id);
    setCurrentArticle(id);
  }

  window.setTimeout(() => {
    document.querySelector(`[data-article-id="${CSS.escape(id)}"]`)?.scrollIntoView({
      behavior,
      block: "start",
    });
  }, 30);
}

async function goToIssue(issue) {
  await loadBatchIssue(issue);
  const article = state.articles.find((item) => item.issue === issue);
  if (article) goToArticle(article.id);
}

function applyFilters(preferredId = null) {
  state.loadToken += 1;
  state.filtered = state.articles.filter(articleMatchesFilters);
  state.renderedCount = 0;
  elements.feed.innerHTML = "";

  if (!state.filtered.length) {
    state.currentId = null;
    elements.feed.innerHTML = `
      <div class="feed-empty no-print">
        <strong>沒有符合的文章</strong>
        <span>請調整上方的集數、類別或搜尋文字。</span>
      </div>`;
    updateLoadingStatus();
    renderDirectory();
    updateSelectionUi();
    return;
  }

  const defaultArticle = state.filtered.find((article) => article.issue === latestIssue());
  state.currentId = state.filtered.some((article) => article.id === preferredId)
    ? preferredId
    : defaultArticle?.id ?? state.filtered[0].id;
  const currentIndex = state.filtered.findIndex((article) => article.id === state.currentId);
  appendArticles(Math.max(INITIAL_BATCH_SIZE, currentIndex + 1));
  renderDirectory();
  updateSelectionUi();
  window.setTimeout(() => {
    document.querySelector(`[data-article-id="${CSS.escape(state.currentId)}"]`)?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }, 30);
  scheduleBackgroundLoad(state.loadToken);
}

function updateCurrentFromScroll() {
  state.scrollFrame = null;
  const articles = [...document.querySelectorAll(".article-feed .print-article")];
  if (!articles.length) return;
  const anchor = elements.header.offsetHeight + 36;
  let current = articles[0];
  for (const article of articles) {
    const rectangle = article.getBoundingClientRect();
    if (rectangle.top <= anchor) current = article;
    if (rectangle.top > anchor) break;
  }
  setCurrentArticle(current.dataset.articleId);
}

function onScroll() {
  if (state.scrollFrame) return;
  state.scrollFrame = window.requestAnimationFrame(updateCurrentFromScroll);
}

function preparePrint() {
  const ids = state.selected.size ? [...state.selected] : [state.currentId].filter(Boolean);
  const targets = ids
    .map((id) => state.articles.find((article) => article.id === id))
    .filter(Boolean);
  if (!targets.length) return;

  document.querySelector(".print-bundle")?.remove();
  const bundle = document.createElement("section");
  bundle.className = "print-bundle";
  bundle.innerHTML = targets.map((article) => articleTemplate(article, { printOnly: true })).join("");
  document.body.append(bundle);
  document.body.classList.add("printing");

  const cleanup = () => {
    document.body.classList.remove("printing");
    bundle.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

function bindEvents() {
  let searchTimer;
  const pendingArticleClicks = new Map();
  elements.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => void handleFiltersChanged(), 180);
  });

  for (const select of [
    elements.issueFilter,
    elements.categoryFilter,
  ]) {
    select.addEventListener("change", () => void handleFiltersChanged());
  }

  elements.modeControl.addEventListener("change", () => {
    state.mode = elements.modeControl.value;
    document.querySelectorAll(".print-article").forEach((article) => {
      article.classList.toggle("mode-faithful", state.mode === "faithful");
      article.classList.toggle("mode-reading", state.mode === "reading");
    });
  });

  elements.orientationControl.addEventListener("change", () => {
    state.orientation = elements.orientationControl.value;
    document.body.classList.toggle("orientation-landscape", state.orientation === "landscape");
    elements.pageStyle.textContent = pageStyleText(state.orientation);
  });

  elements.directoryList.addEventListener("click", (event) => {
    const articleButton = event.target.closest("button[data-directory-id]");
    if (!articleButton) return;
    goToArticle(articleButton.dataset.directoryId, "auto");
    toggleArticleSelection(articleButton.dataset.directoryId);
  });

  elements.feed.addEventListener("click", (event) => {
    const article = event.target.closest(".print-article");
    if (!article || event.target.closest("a, button, input, select, textarea, label")) return;

    const articleId = article.dataset.articleId;
    const pendingClick = pendingArticleClicks.get(articleId);
    if (pendingClick) window.clearTimeout(pendingClick);
    pendingArticleClicks.delete(articleId);

    if (event.detail > 1) return;

    const clickTimer = window.setTimeout(() => {
      pendingArticleClicks.delete(articleId);
      if (window.getSelection()?.toString().trim()) return;
      toggleArticleSelection(articleId);
    }, 480);
    pendingArticleClicks.set(articleId, clickTimer);
  });

  elements.selectedSummaryList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("button[data-selected-remove-id]");
    if (removeButton) {
      state.selected.delete(removeButton.dataset.selectedRemoveId);
      renderDirectory();
      updateSelectionUi();
      return;
    }

    const articleButton = event.target.closest("button[data-selected-scroll-id]");
    if (articleButton) goToArticle(articleButton.dataset.selectedScrollId);
  });

  for (const container of [elements.previousIssue, elements.nextIssue]) {
    container.addEventListener("click", (event) => {
      const issueButton = event.target.closest("button[data-issue]");
      if (issueButton) void goToIssue(issueButton.dataset.issue);
    });
  }
  elements.printButton.addEventListener("click", preparePrint);
  window.addEventListener("scroll", onScroll, { passive: true });
}

async function initialize(articles) {
  state.articles = articles.map(hydrateArticle).sort((first, second) =>
    second.issue.localeCompare(first.issue, "zh-TW", { numeric: true }),
  );
  await loadBatchIndex();
  const initialIssue = PREFERRED_ID?.split("-")[0] || latestIssue();
  await loadBatchIssue(initialIssue);
  populateFilters();
  bindEvents();
  applyFilters(PREFERRED_ID);
  scheduleBatchBackgroundLoad();
}

initialize([]).catch((error) => {
  console.error(error);
  elements.feed.innerHTML = '<div class="feed-empty"><strong>文章資料載入失敗</strong><span>請重新整理頁面。</span></div>';
});
