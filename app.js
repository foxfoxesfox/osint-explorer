// Using GitHub Contents API — proper CORS headers, works from any hosted domain
const API_URL = "https://api.github.com/repos/jivoi/awesome-osint/contents/README.md";

let osintTools = [];
let categories = new Set();
let activeCategory = "All";

async function fetchTools() {
    try {
        const res = await fetch(API_URL, {
            headers: { "Accept": "application/vnd.github.v3+json" }
        });

        if (!res.ok) throw new Error(`GitHub API error: status ${res.status}`);

        const json = await res.json();

        if (!json.content) throw new Error("No content returned from GitHub API.");

        // GitHub Contents API returns Base64-encoded content
        const markdown = atob(json.content.replace(/\n/g, ""));

        document.getElementById("toolCount").innerText = "Parsing data...";
        parseMarkdown(markdown);

    } catch (err) {
        document.getElementById("toolCount").innerHTML =
            `<span style="color:#ff6b6b;">Error: ${err.message}. Please refresh.</span>`;
        console.error(err);
    }
}

function parseMarkdown(markdown) {
    const lines = markdown.split("\n");
    // Matches: * [Tool Name](https://...) - Description
    const toolRegex = /^[*-]\s+\[(.+?)\]\((https?:\/\/.+?)\)(?:\s*[-–—:]\s*(.*))?$/;
    let currentCategory = "General";
    let parsingTools = false;

    lines.forEach(line => {
        const trimmed = line.trim();

        // Detect headings: ## [↑](#...) Category Name  OR  ## Category Name
        if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
            // Strip markdown hashes, strip the [↑](...) back-link, clean up
            let heading = trimmed
                .replace(/^#+\s*/, "")                    // remove leading # symbols
                .replace(/\[.*?\]\(.*?\)\s*/g, "")        // remove [↑](...) links
                .replace(/📖|🔍|🕵️|⚠️|🔎/g, "")        // remove emoji
                .trim();

            // Skip the Table of Contents heading itself
            if (heading.toLowerCase().includes("table of contents")) return;
            if (heading.toLowerCase().includes("contributing")) return;
            if (heading.toLowerCase().includes("credits")) return;

            // Once we hit a valid real heading, start parsing tools
            if (heading.length > 0 && heading.length < 60) {
                parsingTools = true;
                currentCategory = heading;
                categories.add(currentCategory);
            }
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
        btn.onclick = () => {
            document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCategory = category;
            filterTools();
        };
        container.appendChild(btn);
    });
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

function filterTools() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();

    const filtered = osintTools.filter(tool => {
        const matchSearch =
            tool.name.toLowerCase().includes(searchTerm) ||
            tool.description.toLowerCase().includes(searchTerm) ||
            tool.category.toLowerCase().includes(searchTerm);
        const matchCat = activeCategory === "All" || tool.category === activeCategory;
        return matchSearch && matchCat;
    });

    renderTable(filtered);
    document.getElementById("toolCount").innerText = `Showing ${filtered.length} active tools.`;
}

document.getElementById("searchInput").addEventListener("input", filterTools);

// Start
fetchTools();