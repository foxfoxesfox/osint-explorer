// Add a random timestamp to bypass aggressive browser caching
const CACHE_BUSTER = new Date().getTime();
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/jivoi/awesome-osint/master/README.md?v=${CACHE_BUSTER}`;

let osintTools = [];
let categories = new Set();
let activeCategory = "All"; 

let sortCol = "name";
let sortAsc = true; 

async function fetchTools() {
    try {
        // Update the loading text so we know it's trying to connect
        document.getElementById("toolCount").innerText = "Connecting to GitHub...";
        
        const response = await fetch(GITHUB_RAW_URL, {
            method: 'GET',
            // Do not send extra headers, this prevents CORS pre-flight blocks
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }
        
        const markdownText = await response.text();
        
        document.getElementById("toolCount").innerText = "Parsing data...";
        parseMarkdown(markdownText);
        
    } catch (error) {
        // Print the exact error to the screen so we can see what's wrong
        document.getElementById("toolCount").innerHTML = `<span style="color: #ff4444;">Connection failed: ${error.message}. Please try refreshing the page.</span>`;
        console.error("Fetch error details:", error);
    }
}

function parseMarkdown(markdown) {
    const lines = markdown.split('\n');
    let currentCategory = "General";
    const toolRegex = /^[*-]\s+\[(.*?)\]\((http.*?)\)(?:\s*(?:[-:]|—)\s*(.*))?$/;
    let parsingTools = false;

    // Reset array to prevent duplicates on reload
    osintTools = [];

    lines.forEach(line => {
        if (line.startsWith('## ↑ ') || line.startsWith('### General Search')) {
            parsingTools = true;
        }
        if (!parsingTools) return;

        if (line.startsWith('### ') || line.startsWith('## ↑ ')) {
            currentCategory = line.replace(/#/g, '').replace('↑', '').trim();
            if (currentCategory.length > 0 && currentCategory.length < 40) {
                categories.add(currentCategory);
            }
        } 
        else {
            const match = line.match(toolRegex);
            if (match) {
                // Force everything to be a string immediately to prevent undefined errors
                const name = String(match[1] || "").trim();
                const url = String(match[2] || "").trim();
                const description = String(match[3] || "No description provided.").trim();
                
                if (url.startsWith('#')) return;
                
                const descLower = description.toLowerCase();
                let difficulty = "Beginner";
                if (descLower.includes("python") || descLower.includes("cli") || descLower.includes("install") || descLower.includes("script") || descLower.includes("api") || descLower.includes("github.com")) {
                    difficulty = "Advanced";
                }

                // Only add if it actually has a name
                if (name.length > 0) {
                    osintTools.push({ name, url, category: currentCategory, description, difficulty });
                }
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

    // Safety check if array is empty
    if (!tools || tools.length === 0) {
        document.getElementById("toolCount").innerText = "No tools found matching your criteria.";
        return;
    }

    tools.forEach((tool, index) => {
        const tr = document.createElement("tr");
        tr.className = "fade-in";
        tr.style.animationDelay = `${Math.min(index * 0.01, 0.3)}s`; 
        
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
    // If tools aren't loaded yet, do nothing
    if (osintTools.length === 0) return;

    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    
    let filteredTools = osintTools.filter(tool => {
        const safeName = String(tool.name).toLowerCase();
        const safeDesc = String(tool.description).toLowerCase();
        const safeCat = String(tool.category).toLowerCase();
        
        const matchesSearch = safeName.includes(searchTerm) || safeDesc.includes(searchTerm) || safeCat.includes(searchTerm);
        const matchesCategory = activeCategory === "All" || tool.category === activeCategory;
        
        return matchesSearch && matchesCategory;
    });

    // Bulletproof Sorting
    filteredTools.sort((a, b) => {
        let valA = String(a[sortCol] || "");
        let valB = String(b[sortCol] || "");

        if (sortCol === "difficulty") {
            valA = a.difficulty === "Beginner" ? "1" : "2";
            valB = b.difficulty === "Beginner" ? "1" : "2";
        } else {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
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

// Add event listeners safely
document.addEventListener("DOMContentLoaded", () => {
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
});

// Start
fetchTools();