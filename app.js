// ── Config ────────────────────────────────────────────────────────────────────
// Using GitHub Contents API — this has proper CORS headers and always works
// from any hosted domain, unlike raw.githubusercontent.com which can be blocked.
const API_URL = "https://api.github.com/repos/jivoi/awesome-osint/contents/README.md";

// ── State ─────────────────────────────────────────────────────────────────────
let allTools        = [];
let activeCategory  = "All";
let sortCol         = "name";
let sortAsc         = true;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const searchInput   = document.getElementById("searchInput");
const tableBody     = document.getElementById("tableBody");
const toolCount     = document.getElementById("toolCount");
const catContainer  = document.getElementById("categoryButtons");
const emptyState    = document.getElementById("emptyState");

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    showSkeletons();
    fetchReadme();
    searchInput.addEventListener("input", () => renderFiltered());
    setupColumnSort();
});

// ── Fetch via GitHub Contents API ────────────────────────────────────────────
async function fetchReadme() {
    try {
        toolCount.textContent = "Connecting to GitHub API...";

        const res = await fetch(API_URL, {
            headers: { "Accept": "application/vnd.github.v3+json" }
        });

        if (!res.ok) throw new Error(`GitHub API responded with status ${res.status}`);

        const json = await res.json();

        // The Contents API returns Base64-encoded file content
        if (!json.content) throw new Error("No content field in GitHub API response.");

        toolCount.textContent = "Decoding & parsing data...";

        // Decode base64 → raw markdown string
        const markdown = atob(json.content.replace(/\n/g, ""));

        parseMarkdown(markdown);

    } catch (err) {
        toolCount.innerHTML = `<span style="color:#ff6b6b;">Failed to load: ${err.message}. Please refresh.</span>`;
        tableBody.innerHTML = "";
        console.error("Fetch error:", err);
    }
}

// ── Parse Markdown → structured tool objects ──────────────────────────────────
function parseMarkdown(markdown) {
    const lines           = markdown.split("\n");
    // Only match lines with a real http/https URL — ignores TOC anchor links
    const toolRegex       = /^[*-]\s+\[(.+?)\]\((https?:\/\/.+?)\)(?:\s*[-–—:]\s*(.*))?$/;
    const categorySet     = new Set();
    let   currentCategory = "General";
    let   parsingTools    = false;

    for (const raw of lines) {
        const line = raw.trim();

        // Start parsing only after the Table of Contents section ends
        if (!parsingTools) {
            if (line.startsWith("## ") || line.startsWith("### ")) {
                const heading = line.replace(/^#+\s*/, "").replace(/↑/g, "").trim();
                // The real content starts at the first short, real heading
                if (heading.length > 0 && heading.length < 50 && !heading.toLowerCase().includes("table of contents")) {
                    parsingTools = true;
                    currentCategory = heading;
                    if (currentCategory.length < 50) categorySet.add(currentCategory);
                }
            }
            continue;
        }

        // Detect new category heading
        if (line.startsWith("## ") || line.startsWith("### ")) {
            const heading = line.replace(/^#+\s*/, "").replace(/↑/g, "").trim();
            if (heading.length > 0 && heading.length < 50) {
                currentCategory = heading;
                categorySet.add(currentCategory);
            }
            continue;
        }

        // Match a tool line
        const m = line.match(toolRegex);
        if (!m) continue;

        const name        = (m[1] || "").trim();
        const url         = (m[2] || "").trim();
        const description = (m[3] || "No description provided.").trim();

        if (!name || !url) continue;

        // Auto-assign difficulty
        const dl = description.toLowerCase();
        const difficulty = (
            dl.includes("python")  ||
            dl.includes(" cli ")   ||
            dl.includes("command") ||
            dl.includes("install") ||
            dl.includes("script")  ||
            dl.includes("terminal")||
            url.includes("github.com")
        ) ? "Advanced" : "Beginner";

        allTools.push({ name, url, category: currentCategory, description, difficulty });
    }

    buildCategoryButtons([...categorySet].sort());
    renderFiltered();
}

// ── Build category pill buttons ───────────────────────────────────────────────
function buildCategoryButtons(cats) {
    catContainer.innerHTML = "";
    ["All", ...cats].forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "cat-btn" + (cat === "All" ? " active" : "");
        btn.textContent = cat;
        btn.addEventListener("click", () => {
            document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCategory = cat;
            renderFiltered();
        });
        catContainer.appendChild(btn);
    });
}

// ── Filter + Sort + Render pipeline ──────────────────────────────────────────
function renderFiltered() {
    const term = searchInput.value.toLowerCase().trim();

    // 1. Filter
    let results = allTools.filter(t => {
        const inSearch = !term ||
            t.name.toLowerCase().includes(term) ||
            t.description.toLowerCase().includes(term) ||
            t.category.toLowerCase().includes(term);
        const inCat = activeCategory === "All" || t.category === activeCategory;
        return inSearch && inCat;
    });

    // 2. Sort
    results = stableSort(results, (a, b) => {
        if (sortCol === "difficulty") {
            const order = { Beginner: 0, Advanced: 1 };
            const diff  = (order[a.difficulty] ?? 0) - (order[b.difficulty] ?? 0);
            return sortAsc ? diff : -diff;
        }
        const va = (a[sortCol] || "").toLowerCase();
        const vb = (b[sortCol] || "").toLowerCase();
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ?  1 : -1;
        return 0;
    });

    // 3. Render
    renderTable(results);
    updateSortArrows();
}

// ── Stable sort (won't cause browser freeze) ─────────────────────────────────
function stableSort(arr, cmp) {
    return arr
        .map((item, idx) => ({ item, idx }))
        .sort((a, b) => cmp(a.item, b.item) || a.idx - b.idx)
        .map(({ item }) => item);
}

// ── Render table rows ─────────────────────────────────────────────────────────
function renderTable(tools) {
    tableBody.innerHTML = "";

    if (tools.length === 0) {
        emptyState.style.display = "block";
        document.getElementById("toolsTable").style.display = "none";
        toolCount.textContent = "No matching tools found.";
        return;
    }

    emptyState.style.display = "none";
    document.getElementById("toolsTable").style.display = "";

    // Use a DocumentFragment for performance (single DOM write)
    const frag = document.createDocumentFragment();

    tools.forEach((t, i) => {
        const tr = document.createElement("tr");
        tr.className = "row-in";
        tr.style.animationDelay = `${Math.min(i * 0.015, 0.4)}s`;

        const badgeClass = t.difficulty === "Advanced" ? "badge badge-advanced" : "badge badge-beginner";

        tr.innerHTML = `
            <td><a class="tool-link" href="${escHtml(t.url)}" target="_blank" rel="noopener noreferrer">${escHtml(t.name)}</a></td>
            <td>${escHtml(t.category)}</td>
            <td>${escHtml(t.description)}</td>
            <td><span class="${badgeClass}">${t.difficulty}</span></td>
        `;
        frag.appendChild(tr);
    });

    tableBody.appendChild(frag);
    toolCount.textContent = `Showing ${tools.length.toLocaleString()} tools`;
    if (allTools.length > 0 && tools.length < allTools.length) {
        toolCount.textContent += ` (of ${allTools.length.toLocaleString()} total)`;
    }
}

// ── Column sort click handlers ────────────────────────────────────────────────
function setupColumnSort() {
    document.querySelectorAll("th.sortable").forEach(th => {
        th.addEventListener("click", () => {
            const col = th.getAttribute("data-col");
            if (sortCol === col) {
                sortAsc = !sortAsc;
            } else {
                sortCol = col;
                sortAsc = true;
            }
            renderFiltered();
        });
    });
}

function updateSortArrows() {
    document.querySelectorAll("th.sortable").forEach(th => {
        const arrow = th.querySelector(".sort-arrow");
        if (!arrow) return;
        if (th.getAttribute("data-col") === sortCol) {
            arrow.textContent = sortAsc ? "▲" : "▼";
        } else {
            arrow.textContent = "";
        }
    });
}

// ── Skeleton loaders while data is fetching ───────────────────────────────────
function showSkeletons() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 12; i++) {
        const tr = document.createElement("tr");
        tr.className = "skeleton";
        tr.innerHTML = `
            <td><div class="skeleton-line" style="width:${60+Math.random()*30}%"></div></td>
            <td><div class="skeleton-line" style="width:${50+Math.random()*30}%"></div></td>
            <td><div class="skeleton-line" style="width:${70+Math.random()*25}%"></div></td>
            <td><div class="skeleton-line" style="width:55%"></div></td>
        `;
        frag.appendChild(tr);
    }
    tableBody.appendChild(frag);
}

// ── XSS-safe HTML escaping ────────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
