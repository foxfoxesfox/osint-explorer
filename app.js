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
    const toolRegex = /^[*-]\s+\[(.*?)\]\((.*?)\)(?:\s*(?:[-:]|—)\s*(.*))?$/;

    lines.forEach(line => {
        if (line.startsWith('### ') || line.startsWith('## ')) {
            currentCategory = line.replace(/#/g, '').trim();
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
        tr.style.animationDelay = `${(index % 15) * 0.02}s`; 
        
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

// Listen for typing in the search bar (fires instantly on every keystroke)
document.getElementById("searchInput").addEventListener("input", filterTools);

// Start
fetchTools();