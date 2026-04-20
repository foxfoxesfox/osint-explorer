const GITHUB_RAW_URL = "https://raw.githubusercontent.com/jivoi/awesome-osint/master/README.md";
let osintTools = [];
let categories = new Set();
let activeCategory = "All"; 

// Default sorting state
let sortCol = "name";
let sortAsc = true; 

async function fetchTools() {
    try {
        const response = await fetch(GITHUB_RAW_URL);
        const markdownText = await response.text();
        parseMarkdown(markdownText);
    } catch (error) {
        document.getElementById("toolCount").innerText = "Error loading tools. Check internet connection.";
        console.error("Error fetching data:", error);
    }
}

function parseMarkdown(markdown) {
    const lines = markdown.split('\n');
    let currentCategory = "General";
    const toolRegex = /^[*-]\s+\[(.*?)\]\((http.*?)\)(?:\s*(?:[-:]|—)\s*(.*))?$/;
    let parsingTools = false;

    lines.forEach(line => {
        if (line.startsWith('## ↑ ') || line.startsWith('### General Search')) {
            parsingTools = true;
        }
        if (!parsingTools) return;

        if (line.startsWith('### ') || line.startsWith('## ↑ ')) {
            currentCategory = line.replace(/#/g, '').replace('↑', '').trim();
            if (currentCategory.length < 40) {
                categories.add(currentCategory);
            }
        } 
        else {
            const match = line.match(toolRegex);
            if (match) {
                const name = match[1].trim();
                const url = match[2].trim();
                const description = match[3] ? match[3].trim() : "No description provided.";
                
                if (url.startsWith('#')) return;
                
                const descLower = description.toLowerCase();
                let difficulty = "Beginner";
                if (descLower.includes("python") || descLower.includes("cli") || descLower.includes("install") || descLower.includes("script") || descLower.includes("api") || descLower.includes("github.com")) {
                    difficulty = "Advanced";
                }

                osintTools.push({ name, url, category: currentCategory, description, difficulty });
            }
        }
    });

    populateCategoryButtons();
    filterTools(); 
}

function populateCategoryButtons() {
    const container = document.getElementById("categoryButtons");
    container.innerHTML = ""; 
    
    const sortedCategories = ["All", ...Array.from(categories).sort()];
    
    sortedCategories.forEach(category => {
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
        tr.style.animationDelay = `${Math.min(index * 0.02, 0.5)}s`; 
        
        const diffClass = tool.difficulty === "Advanced" ? "tag-advanced" : "tag-beginner";

        tr.innerHTML = `
            <td><a href="${tool.url}" class="tool-link" target="_blank">${tool.name}</a></td>
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
    
    let filteredTools = osintTools.filter(tool => {
        // Safe lowercasing for search
        const safeName = (tool.name || "").toLowerCase();
        const safeDesc = (tool.description || "").toLowerCase();
        const safeCat = (tool.category || "").toLowerCase();
        
        const matchesSearch = safeName.includes(searchTerm) || safeDesc.includes(searchTerm) || safeCat.includes(searchTerm);
        const matchesCategory = activeCategory === "All" || tool.category === activeCategory;
        
        return matchesSearch && matchesCategory;
    });

    // Handle Sorting Safely
    filteredTools.sort((a, b) => {
        // Safe value extraction to prevent undefined errors
        let valA = a[sortCol] || "";
        let valB = b[sortCol] || "";

        if (sortCol === "difficulty") {
            valA = a.difficulty === "Beginner" ? 1 : 2;
            valB = b.difficulty === "Beginner" ? 1 : 2;
        } else {
            // Only lowercase if it's a string
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });

    updateSortHeaders();
    renderTable(filteredTools);
}

function updateSortHeaders() {
    document.querySelectorAll('th.sortable .sort-icon').forEach(icon => icon.innerText = '');
    const activeTh = document.querySelector(`th[data-sort="${sortCol}"] .sort-icon`);
    if (activeTh) {
        activeTh.innerText = sortAsc ? ' ▲' : ' ▼';
    }
}

document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (sortCol === col) {
            sortAsc = !sortAsc; 
        } else {
            sortCol = col;
            sortAsc = true; 
        }
        filterTools();
    });
});

document.getElementById("searchInput").addEventListener("input", filterTools);

// Start
fetchTools();