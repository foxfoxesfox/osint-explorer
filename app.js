const GITHUB_RAW_URL = "https://raw.githubusercontent.com/jivoi/awesome-osint/master/README.md";
let osintTools = [];
let categories = new Set();
let activeCategory = "All"; 

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
    
    // We only want tools that start with a bullet point and have a standard URL format
    const toolRegex = /^[*-]\s+\[(.*?)\]\((http.*?)\)(?:\s*(?:[-:]|—)\s*(.*))?$/;
    
    // Flag to tell us when we are past the Table of Contents
    let parsingTools = false;

    lines.forEach(line => {
        // Stop skipping lines once we hit the first real category after the TOC
        if (line.startsWith('## ↑ ') || line.startsWith('### General Search')) {
            parsingTools = true;
        }

        // If we are still in the Table of Contents, skip this line
        if (!parsingTools) return;

        // Find category headers (usually ## ↑ or ###)
        if (line.startsWith('### ') || line.startsWith('## ↑ ')) {
            // Clean up the category name by removing markdown hashes and arrows
            currentCategory = line.replace(/#/g, '').replace('↑', '').trim();
            if (currentCategory.length < 40) {
                categories.add(currentCategory);
            }
        } 
        else {
            // Only match lines that have http/https in the URL part
            const match = line.match(toolRegex);
            if (match) {
                const name = match[1].trim();
                const url = match[2].trim();
                const description = match[3] ? match[3].trim() : "No description provided.";
                
                // Skip it if it accidentally grabbed a table of contents anchor link
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
    renderTable(osintTools);
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
        // Cap the animation delay so huge lists don't take forever to fade in
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
    
    const filteredTools = osintTools.filter(tool => {
        const matchesSearch = tool.name.toLowerCase().includes(searchTerm) || tool.description.toLowerCase().includes(searchTerm) || tool.category.toLowerCase().includes(searchTerm);
        const matchesCategory = activeCategory === "All" || tool.category === activeCategory;
        
        return matchesSearch && matchesCategory;
    });

    renderTable(filteredTools);
}

document.getElementById("searchInput").addEventListener("input", filterTools);

// Start
fetchTools();