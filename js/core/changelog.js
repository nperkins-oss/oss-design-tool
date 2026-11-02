// SUBSYSTEM: Core Platform — Interactive Version Badge & Release Notes Changelog Modal (js/core/changelog.js)

const CHANGELOG_SEEN_STORAGE_KEY = "oss_last_seen_changelog_version";

function hasUnseenChangelog() {
  try {
    if (typeof localStorage === "undefined" || !localStorage) return false;
    return localStorage.getItem(CHANGELOG_SEEN_STORAGE_KEY) !== APP_VERSION;
  } catch (_err) {
    return false;
  }
}

function markChangelogSeen() {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(CHANGELOG_SEEN_STORAGE_KEY, APP_VERSION);
    }
  } catch (_err) {
    // Ignore storage restriction
  }
  renderVersionBadge();
}

function renderVersionBadge() {
  const el = document.getElementById("appVersionBadge");
  if (!el) return;
  const env = getAppEnvironment();
  const label = env.id === "production" ? `v${APP_VERSION}` : `v${APP_VERSION} • ${env.label}`;
  const safeLabel = String(label).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const unseen = hasUnseenChangelog();
  el.innerHTML = unseen
    ? `<span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" title="New release notes available"></span><span>${safeLabel}</span>`
    : `<span>${safeLabel}</span>`;
  el.title = `Click to view What's New & Release Notes — OSS Network Design Tool v${APP_VERSION} | Build ${BUILD_NUMBER} | Schema v${SCHEMA_VERSION} (${env.label})`;
  el.className = `text-[10px] font-mono border px-1.5 py-0.5 rounded hidden sm:inline-flex items-center gap-1 cursor-pointer transition-colors hover:bg-slate-800 ${env.badgeClass}`;
}

// =========================================================================
// WHAT'S NEW & RELEASE NOTES (CHANGELOG) ENGINE & INTERACTIVE MODAL
// Live Keep-a-Changelog Markdown Parser, Search/Channel Filter & Timeline
// =========================================================================
let _cachedChangelogReleases = null;
let _changelogSearchQuery = "";
let _changelogChannelFilter = "all"; // "all" | "current" | "beta" | "alpha"
let _changelogShowAllHistory = false;

function _clEscHTML(s) {
  if (typeof escapeHTML === "function") return escapeHTML(s);
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function _clEscJSAttr(s) {
  if (typeof escapeJSAttr === "function") return escapeJSAttr(s);
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function formatChangelogInlineHTML(rawText) {
  const safe = _clEscHTML(String(rawText || ""));
  const codeTokens = [];
  const withCodePlaceholders = safe.replace(/`([^`]+)`/g, (_m, code) => {
    const idx = codeTokens.length;
    codeTokens.push(`<code class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] border border-slate-700/80">${code}</code>`);
    return `\u0000CODE_${idx}\u0000`;
  });

  const formatted = withCodePlaceholders
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,;:]|$)/g, '$1<em class="text-indigo-300 italic">$2</em>');

  return formatted.replace(/\u0000CODE_(\d+)\u0000/g, (_m, idx) => codeTokens[Number(idx)] || "");
}

function parseChangelogMarkdown(mdText) {
  const lines = String(mdText || "").replace(/\r\n/g, "\n").split("\n");
  const releases = [];
  let currentRelease = null;
  let currentSection = null;
  let lastBullet = null;

  for (const rawLine of lines) {
    const relMatch = rawLine.match(/^## \[([^\]]+)\](?:\s*-\s*(.+))?$/);
    if (relMatch) {
      const version = relMatch[1].trim();
      const date = (relMatch[2] || "").trim();
      const vLow = version.toLowerCase();
      const channel = vLow.includes("-beta")
        ? "beta"
        : vLow.includes("-alpha")
          ? "alpha"
          : vLow.includes("-rc")
            ? "rc"
            : "release";
      currentRelease = {
        version,
        date,
        channel,
        isCurrent: version === APP_VERSION,
        sections: [],
        searchParts: [version.toLowerCase(), date.toLowerCase()]
      };
      releases.push(currentRelease);
      currentSection = null;
      lastBullet = null;
      continue;
    }

    if (!currentRelease) continue;

    const secMatch = rawLine.match(/^### (.+)$/);
    if (secMatch) {
      const title = secMatch[1].trim();
      currentSection = {
        title,
        titleHtml: formatChangelogInlineHTML(title),
        items: []
      };
      currentRelease.sections.push(currentSection);
      currentRelease.searchParts.push(title.toLowerCase());
      lastBullet = null;
      continue;
    }

    const subBulletMatch = rawLine.match(/^\s{2,}-\s+(.+)$/);
    if (subBulletMatch) {
      const text = subBulletMatch[1].trim();
      if (!currentSection) {
        currentSection = { title: "Highlights", titleHtml: "Highlights", items: [] };
        currentRelease.sections.push(currentSection);
      }
      if (lastBullet) {
        lastBullet.subItems.push({ raw: text, html: formatChangelogInlineHTML(text) });
      } else {
        lastBullet = { raw: text, html: formatChangelogInlineHTML(text), subItems: [] };
        currentSection.items.push(lastBullet);
      }
      currentRelease.searchParts.push(text.toLowerCase());
      continue;
    }

    const topBulletMatch = rawLine.match(/^-\s+(.+)$/);
    if (topBulletMatch) {
      const text = topBulletMatch[1].trim();
      if (!currentSection) {
        currentSection = { title: "Highlights", titleHtml: "Highlights", items: [] };
        currentRelease.sections.push(currentSection);
      }
      lastBullet = { raw: text, html: formatChangelogInlineHTML(text), subItems: [] };
      currentSection.items.push(lastBullet);
      currentRelease.searchParts.push(text.toLowerCase());
    }
  }

  for (const rel of releases) {
    rel.searchBlob = rel.searchParts.join(" ");
    delete rel.searchParts;
  }
  return releases;
}

async function loadChangelogReleases(forceReload = false) {
  if (_cachedChangelogReleases && !forceReload) {
    return _cachedChangelogReleases;
  }
  try {
    if (typeof fetch === "function") {
      const resp = await fetch(`./CHANGELOG.md?v=${encodeURIComponent(APP_VERSION)}`, { cache: "no-cache" });
      if (resp && resp.ok) {
        const text = await resp.text();
        if (text && text.includes("## [")) {
          _cachedChangelogReleases = parseChangelogMarkdown(text);
          return _cachedChangelogReleases;
        }
      }
    }
  } catch (_err) {
    // Fallback below when opened directly over file:// protocol without a local HTTP server
  }

  return [
    {
      version: APP_VERSION,
      date: BUILD_NUMBER.slice(0, 10).replace(/\./g, "-"),
      channel: APP_VERSION.includes("-beta") ? "beta" : APP_VERSION.includes("-alpha") ? "alpha" : "release",
      isCurrent: true,
      searchBlob: `${APP_VERSION.toLowerCase()} local file preview`,
      sections: [
        {
          title: "Active Build Metadata",
          titleHtml: "Active Build Metadata",
          items: [
            {
              raw: `Running OSS Network Design Tool v${APP_VERSION} (Build ${BUILD_NUMBER}, Schema v${SCHEMA_VERSION}).`,
              html: formatChangelogInlineHTML(`Running **OSS Network Design Tool** \`v${APP_VERSION}\` (Build \`${BUILD_NUMBER}\`, Schema \`v${SCHEMA_VERSION}\`).`),
              subItems: [
                {
                  raw: "Serve over HTTP (npm run serve) or open on Azure Static Web Apps to stream the full CHANGELOG.md history.",
                  html: formatChangelogInlineHTML("Serve over HTTP (\`npm run serve\`) or open on Azure Static Web Apps to stream the full \`CHANGELOG.md\` release archive.")
                }
              ]
            }
          ]
        }
      ]
    }
  ];
}

function getFilteredChangelogReleases(releases) {
  const list = Array.isArray(releases) ? releases : [];
  const q = String(_changelogSearchQuery || "").trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  return list.filter((rel) => {
    if (_changelogChannelFilter === "current" && !rel.isCurrent) return false;
    if (_changelogChannelFilter === "beta" && rel.channel !== "beta") return false;
    if (_changelogChannelFilter === "alpha" && rel.channel !== "alpha") return false;
    if (tokens.length > 0) {
      for (const tok of tokens) {
        if (!rel.searchBlob.includes(tok)) return false;
      }
    }
    return true;
  });
}

function getChangelogChannelBadgeHTML(rel) {
  if (rel.channel === "beta") {
    return '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">Beta</span>';
  }
  if (rel.channel === "alpha") {
    return '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">Alpha</span>';
  }
  if (rel.channel === "rc") {
    return '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">RC</span>';
  }
  return '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Release</span>';
}

function getChangelogCardDomId(version) {
  return "changelog-ver-" + String(version || "").replace(/[^A-Za-z0-9_-]/g, "_");
}

function renderChangelogFeedAndTimeline() {
  const releases = _cachedChangelogReleases || [];
  const filtered = getFilteredChangelogReleases(releases);
  const timelineEl = document.getElementById("changelogVersionTimeline");
  const feedEl = document.getElementById("changelogFeedContainer");
  const countEl = document.getElementById("changelogMatchCountBadge");
  const clearBtn = document.getElementById("changelogSearchClearBtn");

  if (clearBtn) {
    if (_changelogSearchQuery && _changelogSearchQuery.trim()) clearBtn.classList.remove("hidden");
    else clearBtn.classList.add("hidden");
  }

  if (countEl) {
    countEl.textContent = filtered.length === releases.length
      ? `${releases.length} releases`
      : `${filtered.length} of ${releases.length} releases`;
  }

  // Update channel filter button active states
  const channelBtns = document.querySelectorAll("[data-changelog-filter]");
  channelBtns.forEach((btn) => {
    const isAct = btn.getAttribute("data-changelog-filter") === _changelogChannelFilter;
    btn.className = isAct
      ? "px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white border border-indigo-500 cursor-pointer transition-colors"
      : "px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer transition-colors";
  });

  if (timelineEl) {
    if (filtered.length === 0) {
      timelineEl.innerHTML = '<div class="px-2 py-4 text-xs text-slate-500 text-center">No matching versions</div>';
    } else {
      timelineEl.innerHTML = filtered.map((rel) => {
        const dotClass = rel.isCurrent
          ? "bg-emerald-400"
          : rel.channel === "beta"
            ? "bg-amber-400"
            : "bg-slate-500";
        return `
          <button type="button" onclick="scrollToChangelogVersion('${_clEscJSAttr(rel.version)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800/90 border ${rel.isCurrent ? 'bg-indigo-500/10 border-indigo-500/40' : 'border-transparent'} transition-colors cursor-pointer group">
            <div class="flex items-center justify-between gap-1.5">
              <span class="flex items-center gap-1.5 font-mono text-xs font-bold ${rel.isCurrent ? 'text-white' : 'text-slate-300 group-hover:text-white'}">
                <span class="w-1.5 h-1.5 rounded-full ${dotClass} shrink-0"></span>
                v${_clEscHTML(rel.version)}
              </span>
              ${rel.isCurrent ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold uppercase">Live</span>' : ''}
            </div>
            ${rel.date ? `<div class="text-[10px] text-slate-500 font-mono pl-3 mt-0.5">${_clEscHTML(rel.date)}</div>` : ''}
          </button>
        `;
      }).join("");
    }
  }

  if (!feedEl) return;

  if (filtered.length === 0) {
    feedEl.innerHTML = `
      <div class="py-16 text-center space-y-2">
        <div class="text-sm font-bold text-slate-300">No release notes match "${_clEscHTML(_changelogSearchQuery)}"</div>
        <div class="text-xs text-slate-500">Try a broader keyword (e.g., StackPower, 48P, Genetec, C9350, UPS, Wizard) or reset the channel filter.</div>
        <button type="button" onclick="resetChangelogFilters()" class="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 cursor-pointer">Reset Filters</button>
      </div>
    `;
    return;
  }

  const isSearching = Boolean(_changelogSearchQuery && _changelogSearchQuery.trim());
  const defaultLimit = 12;
  const visibleReleases = (isSearching || _changelogShowAllHistory || filtered.length <= defaultLimit)
    ? filtered
    : filtered.slice(0, defaultLimit);
  const hiddenCount = filtered.length - visibleReleases.length;

  const cardsHtml = visibleReleases.map((rel) => {
    const domId = getChangelogCardDomId(rel.version);
    const cardBorder = rel.isCurrent
      ? "border-indigo-500/50 bg-slate-900/95 shadow-lg"
      : "border-slate-800 bg-slate-900/60";
    const sectionsHtml = rel.sections.map((sec) => `
      <div class="space-y-2">
        <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-300 border-b border-slate-800/90 pb-1">${sec.titleHtml}</h4>
        <ul class="space-y-2 text-xs text-slate-300 leading-relaxed">
          ${sec.items.map((item) => `
            <li class="space-y-1.5">
              <div class="flex items-start gap-2">
                <span class="text-indigo-400 font-bold mt-0.5 shrink-0">&bull;</span>
                <div class="flex-1 min-w-0">${item.html}</div>
              </div>
              ${item.subItems.length > 0 ? `
                <ul class="pl-4 space-y-1 text-slate-400">
                  ${item.subItems.map((sub) => `
                    <li class="flex items-start gap-2">
                      <span class="text-slate-500 shrink-0">&ndash;</span>
                      <div class="flex-1 min-w-0">${sub.html}</div>
                    </li>
                  `).join("")}
                </ul>
              ` : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    `).join("");

    return `
      <article id="${domId}" class="rounded-xl border ${cardBorder} p-4 sm:p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-sm sm:text-base font-bold text-white">v${_clEscHTML(rel.version)}</span>
            ${rel.isCurrent ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">Current Build</span>' : ''}
            ${getChangelogChannelBadgeHTML(rel)}
          </div>
          ${rel.date ? `<span class="text-xs font-mono text-slate-400 bg-slate-950/70 px-2.5 py-0.5 rounded-lg border border-slate-800">${_clEscHTML(rel.date)}</span>` : ''}
        </div>
        <div class="space-y-4">
          ${sectionsHtml}
        </div>
      </article>
    `;
  }).join("");

  const showMoreHtml = hiddenCount > 0 ? `
    <div class="pt-2 pb-4 text-center">
      <button type="button" onclick="toggleChangelogShowAllHistory(true)" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer">
        Show All ${filtered.length} Documented Releases (${hiddenCount} Earlier Milestones)
      </button>
    </div>
  ` : "";

  feedEl.innerHTML = cardsHtml + showMoreHtml;
}

async function openChangelogModal(initialVersion = "") {
  const modal = document.getElementById("changelogModal");
  if (!modal) return;

  markChangelogSeen();
  const env = getAppEnvironment();

  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" style="height: 88vh;" onclick="event.stopPropagation()">
      <!-- Modal Header -->
      <div class="px-4 sm:px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-start sm:items-center justify-between gap-3 shrink-0">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <div class="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
            </div>
            <h2 class="text-lg font-bold text-white tracking-tight">What's New &amp; Release Notes</h2>
            <span class="text-xs font-mono px-2 py-0.5 rounded border ${env.badgeClass}">v${_clEscHTML(APP_VERSION)} &bull; ${_clEscHTML(env.label)}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Build ${_clEscHTML(BUILD_NUMBER)}</span>
            <span class="text-slate-700">|</span>
            <span>Schema v${_clEscHTML(SCHEMA_VERSION)}</span>
            <span class="text-slate-700">|</span>
            <span id="changelogMatchCountBadge">Loading releases...</span>
          </div>
        </div>
        <button type="button" onclick="closeChangelogModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer" title="Close (Esc)">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Search & Channel Filter Bar -->
      <div class="px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
        <div class="relative flex-1 max-w-md flex items-center gap-2 bg-slate-950 border border-slate-700/80 focus-within:border-indigo-500 rounded-xl px-3 py-1.5">
          <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
          <input
            id="changelogSearchInput"
            type="text"
            value="${_clEscHTML(_changelogSearchQuery)}"
            placeholder="Search features, SKUs, studios, or versions..."
            autocomplete="off"
            oninput="setChangelogSearchQuery(this.value)"
            class="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button id="changelogSearchClearBtn" type="button" onclick="setChangelogSearchQuery('')" class="${_changelogSearchQuery ? '' : 'hidden'} text-slate-400 hover:text-white text-xs font-bold ml-1.5 cursor-pointer" title="Clear search">&times;</button>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <button type="button" data-changelog-filter="all" onclick="setChangelogChannelFilter('all')">All</button>
          <button type="button" data-changelog-filter="current" onclick="setChangelogChannelFilter('current')">Current Build</button>
          <button type="button" data-changelog-filter="beta" onclick="setChangelogChannelFilter('beta')">v0.11 Beta</button>
          <button type="button" data-changelog-filter="alpha" onclick="setChangelogChannelFilter('alpha')">v0.10 Alpha</button>
        </div>
      </div>

      <!-- Main Split View: Version Timeline + Release Cards -->
      <div class="flex-1 flex overflow-hidden min-h-0">
        <aside class="hidden md:flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950/60 overflow-hidden">
          <div class="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
            Version Timeline
          </div>
          <div id="changelogVersionTimeline" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
        </aside>
        <div id="changelogFeedContainer" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div class="py-12 text-center text-xs text-slate-400 font-mono">Loading CHANGELOG.md...</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 sm:px-6 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <span>Source: <code class="font-mono text-slate-300">CHANGELOG.md</code> (Keep a Changelog / SemVer 2.0)</span>
        <button type="button" onclick="closeChangelogModal()" class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors cursor-pointer">Close</button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  if (typeof safeCreateIcons === "function") safeCreateIcons();

  await loadChangelogReleases();
  renderChangelogFeedAndTimeline();

  if (initialVersion) {
    scrollToChangelogVersion(initialVersion);
  }
}

function closeChangelogModal() {
  const modal = document.getElementById("changelogModal");
  if (modal) modal.classList.add("hidden");
}

function setChangelogSearchQuery(query) {
  _changelogSearchQuery = String(query || "");
  const inp = document.getElementById("changelogSearchInput");
  if (inp && inp.value !== _changelogSearchQuery) {
    inp.value = _changelogSearchQuery;
  }
  renderChangelogFeedAndTimeline();
}

function setChangelogChannelFilter(filter) {
  _changelogChannelFilter = filter || "all";
  renderChangelogFeedAndTimeline();
}

function resetChangelogFilters() {
  _changelogSearchQuery = "";
  _changelogChannelFilter = "all";
  const inp = document.getElementById("changelogSearchInput");
  if (inp) inp.value = "";
  renderChangelogFeedAndTimeline();
}

function toggleChangelogShowAllHistory(showAll) {
  _changelogShowAllHistory = Boolean(showAll);
  renderChangelogFeedAndTimeline();
}

function scrollToChangelogVersion(version) {
  if (!_changelogShowAllHistory) {
    _changelogShowAllHistory = true;
    renderChangelogFeedAndTimeline();
  }
  const domId = getChangelogCardDomId(version);
  const card = document.getElementById(domId);
  if (card && typeof card.scrollIntoView === "function") {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

window.hasUnseenChangelog = hasUnseenChangelog;
window.markChangelogSeen = markChangelogSeen;
window.formatChangelogInlineHTML = formatChangelogInlineHTML;
window.parseChangelogMarkdown = parseChangelogMarkdown;
window.loadChangelogReleases = loadChangelogReleases;
window.openChangelogModal = openChangelogModal;
window.closeChangelogModal = closeChangelogModal;
window.setChangelogSearchQuery = setChangelogSearchQuery;
window.setChangelogChannelFilter = setChangelogChannelFilter;
window.resetChangelogFilters = resetChangelogFilters;
window.toggleChangelogShowAllHistory = toggleChangelogShowAllHistory;
window.scrollToChangelogVersion = scrollToChangelogVersion;

window.renderVersionBadge = renderVersionBadge;
if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Core.Changelog", {
    renderVersionBadge,
    hasUnseenChangelog,
    markChangelogSeen,
    parseChangelogMarkdown,
    openChangelogModal,
    closeChangelogModal
  });
}
