const API_URL = "https://api.github.com/repos/jivoi/awesome-osint/contents/README.md";

let osintTools     = [];
let categories     = new Set();
let activeCategory = "All";

// Sorting state
let sortCol = "name";
let sortAsc = true;

async function fetchTools() {
    try {
        const res = await fetch(API_URL, {
            headers: { "Accept": "application/vnd.github.v3+json" }
        });
        if (!res.ok) throw new Error(`GitHub API error: status ${res.status}`);

        const json = await res.json();
        if (!json.content) throw new Error("No content returned from GitHub API.");

        const markdown = atob(json.content.replace(/\n/g, ""));
        document.getElementById("toolCount").innerText = "Parsing data...";
        parseMarkdown(markdown);

    } catch (err) {
        document.getElementById("toolCount").innerHTML =
            `<span style="color:#ff6b6b;">Error: ${err.message}. Please refresh.</span>`;
        console.error(err);
    }
}

function cleanHeading(raw) {
    return raw
        .replace(/^#+\s*/, "")
        .replace(/\[.*?\]\(.*?\)\s*/g, "")
        .replace(/[^\x00-\x7F]/g, "")
        .replace(/[*_`~]/g, "")
        .trim();
}

function parseMarkdown(markdown) {
    const lines     = markdown.split("\n");
    const toolRegex = /^[*-]\s*\[(.+?)\]\((https?:\/\/.+?)\)(?:\s*[-–—:]\s*(.*))?$/;

    let currentCategory = "General";
    let parsingTools    = false;

    const skipHeadings = new Set([
        "table of contents", "contributing", "credits", "license", ""
    ]);

    lines.forEach(line => {
        const trimmed = line.trim();

        if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
            const heading = cleanHeading(trimmed);
            if (skipHeadings.has(heading.toLowerCase())) return;
            parsingTools    = true;
            currentCategory = heading;
            categories.add(currentCategory);
            return;
        }

        if (!parsingTools) return;

        const match = trimmed.match(toolRegex);
        if (!match) return;

        const name        = (match[1] || "").trim();
        const url         = (match[2] || "").trim();
        const description = (match[3] || "No description provided.").trim();
        if (!name || !url) return;

        const dl = description.toLowerCase();
        const difficulty = (
            dl.includes("python")   ||
            dl.includes(" cli ")    ||
            dl.includes("command")  ||
            dl.includes("install")  ||
            dl.includes("script")   ||
            dl.includes("terminal") ||
            url.includes("github.com")
        ) ? "Advanced" : "Beginner";

        osintTools.push({ name, url, category: currentCategory, description, difficulty });
    });

    // Default sort: name A→Z
    osintTools.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    populateCategoryButtons();
    renderTable(osintTools);
}

function populateCategoryButtons() {
    const container = document.getElementById("categoryButtons");
    container.innerHTML = "";

    const sorted = ["All", ...Array.from(categories).sort()];

    sorted.forEach(category => {
        const btn = document.createElement("button");
        btn.className = "category-btn" + (category === "All" ? " active" : "");
        btn.innerText = category;
        btn.setAttribute("data-cat", category);

        btn.onclick = () => {
            if (activeCategory === category && category !== "All") {
                activeCategory = "All";
            } else {
                activeCategory = category;
            }
            document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
            const allBtn = document.querySelector(`.category-btn[data-cat="All"]`);
            if (allBtn) allBtn.classList.add("active");
            if (activeCategory !== "All") btn.classList.add("active");
            filterAndRender();
        };

        container.appendChild(btn);
    });
}

// ── Sorting ───────────────────────────────────────────────────────────────────
function sortBy(col) {
    if (sortCol === col) {
        sortAsc = !sortAsc;
    } else {
        sortCol = col;
        // Difficulty: default Beginner first (ascending)
        sortAsc = true;
    }
    updateSortIcons();
    filterAndRender();
}

function updateSortIcons() {
    ["name", "category", "description", "difficulty"].forEach(col => {
        const el = document.getElementById(`sort-${col}`);
        const th = document.querySelector(`th[data-col="${col}"]`);
        if (!el || !th) return;
        if (col === sortCol) {
            el.textContent = sortAsc ? "▲" : "▼";
            th.classList.add("active-sort");
        } else {
            el.textContent = "";
            th.classList.remove("active-sort");
        }
    });
}

function filterAndRender() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();

    let filtered = osintTools.filter(tool => {
        const matchSearch =
            tool.name.toLowerCase().includes(searchTerm) ||
            tool.description.toLowerCase().includes(searchTerm) ||
            tool.category.toLowerCase().includes(searchTerm);
        const matchCat = activeCategory === "All" || tool.category === activeCategory;
        return matchSearch && matchCat;
    });

    // Sort
    filtered.sort((a, b) => {
        let va, vb;
        if (sortCol === "difficulty") {
            // Beginner = 0, Advanced = 1 so ascending = Beginner first
            va = a.difficulty === "Beginner" ? 0 : 1;
            vb = b.difficulty === "Beginner" ? 0 : 1;
            return sortAsc ? va - vb : vb - va;
        }
        va = (a[sortCol] || "").toLowerCase();
        vb = (b[sortCol] || "").toLowerCase();
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ?  1 : -1;
        return 0;
    });

    renderTable(filtered);
}

function renderTable(tools) {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    tools.forEach((tool, index) => {
        const tr = document.createElement("tr");
        tr.className = "fade-in";
        tr.style.animationDelay = `${Math.min(index * 0.015, 0.4)}s`;

        const diffClass = tool.difficulty === "Advanced" ? "tag-advanced" : "tag-beginner";

        tr.innerHTML = `
            <td><a href="${tool.url}" class="tool-link" target="_blank" rel="noopener noreferrer">${tool.name}</a></td>
            <td>${tool.category}</td>
            <td>${tool.description}</td>
            <td><span class="${diffClass}">${tool.difficulty}</span></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("toolCount").innerText = `Showing ${tools.length} active tools.`;
}

document.getElementById("searchInput").addEventListener("input", filterAndRender);

fetchTools();