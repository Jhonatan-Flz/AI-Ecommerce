// Temporary fallback catalog used only if index.html is opened directly via file://
// Once served over HTTP (Live Server or FastAPI), products.json is loaded automatically.
const FALLBACK_PRODUCTS = [
  {
    id: 1,
    title: "Warm Minimalist Desk Lamp",
    category: "Lighting",
    price: 42,
    channel: "official",
    description: "Adjustable warm LED lamp designed for late-night studying without eye strain and clean minimalist desks.",
    tags: ["cozy", "study", "night", "minimalist", "desk", "light", "warm"],
    complements: [2, 5],
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 2,
    title: "Magnetic Cable Organizer Tray",
    category: "Workspace",
    price: 24,
    channel: "marketplace",
    description: "Under-desk steel tray and magnetic clips to hide power strips and keep workstation setups clutter-free.",
    tags: ["setup", "cables", "clean", "organize", "desk", "minimalist"],
    complements: [1, 4],
    image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 3,
    title: "Portable Pour-Over Travel Coffee Kit",
    category: "Lifestyle",
    price: 58,
    channel: "affiliate",
    description: "Compact insulated dripper and stainless steel tumbler built for commuters, flights, and hotel mornings.",
    tags: ["coffee", "travel", "gift", "portable", "commute", "morning"],
    complements: [6],
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 4,
    title: "ANC Wireless Studio Headphones",
    category: "Audio",
    price: 165,
    channel: "official",
    description: "Active noise-canceling over-ear headphones for deep focus in noisy cafes, libraries, or open offices.",
    tags: ["focus", "study", "quiet", "music", "work", "noise"],
    complements: [1, 2],
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 5,
    title: "Walnut Monitor Riser Stand",
    category: "Workspace",
    price: 68,
    channel: "marketplace",
    description: "Ergonomic solid wood shelf that elevates monitors to eye level and stores notebooks underneath.",
    tags: ["ergonomic", "desk", "wood", "aesthetic", "posture", "setup"],
    complements: [1, 2],
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 6,
    title: "Weatherproof Tech Pouch",
    category: "Lifestyle",
    price: 35,
    channel: "affiliate",
    description: "Origami-style organizer for chargers, adapters, and small essentials when traveling light.",
    tags: ["travel", "organize", "bag", "cables", "gift", "portable"],
    complements: [3, 4],
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80"
  }
];

const state = {
  products: [],
  keyword: "",
  category: "all",
  maxPrice: 250,
  channels: new Set(["official", "marketplace", "affiliate"]),
  aiPrompt: "",
  viewedIds: [] // Simulates algorithmic memory for recommendations
};

// DOM Elements
const resultsGrid = document.getElementById("results-grid");
const recommendationsGrid = document.getElementById("recommendations-grid");
const resultsTitle = document.getElementById("results-title");
const resultsSubtitle = document.getElementById("results-subtitle");
const keywordInput = document.getElementById("keyword-input");
const categorySelect = document.getElementById("category-select");
const priceRange = document.getElementById("price-range");
const priceValue = document.getElementById("price-value");
const channelCheckboxes = document.querySelectorAll(".channel-checkbox");
const resetBtn = document.getElementById("reset-btn");

// AI Corner Elements
const aiForm = document.getElementById("ai-form");
const aiInput = document.getElementById("ai-input");
const aiReply = document.getElementById("ai-reply");
const activeAiPill = document.getElementById("active-ai-pill");
const activeAiText = document.getElementById("active-ai-text");
const clearAiBtn = document.getElementById("clear-ai-btn");

// Modal Elements
const modal = document.getElementById("product-modal");
const modalBody = document.getElementById("modal-body");
const closeModalBtn = document.getElementById("close-modal-btn");

async function init() {
  try {
    const response = await fetch("./products.json");
    if (!response.ok) throw new Error("Failed to fetch products.json");
    state.products = await response.json();
  } catch {
    // Graceful fallback for local file:// preview
    state.products = FALLBACK_PRODUCTS;
  }

  bindEvents();
  renderAll();
}

function bindEvents() {
  keywordInput.addEventListener("input", (e) => {
    state.keyword = e.target.value.trim().toLowerCase();
    renderAll();
  });

  categorySelect.addEventListener("change", (e) => {
    state.category = e.target.value;
    renderAll();
  });

  priceRange.addEventListener("input", (e) => {
    state.maxPrice = Number(e.target.value);
    priceValue.textContent = `$${state.maxPrice}`;
    renderAll();
  });

  channelCheckboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      state.channels.clear();
      channelCheckboxes.forEach((box) => {
        if (box.checked) state.channels.add(box.value);
      });
      renderAll();
    });
  });

  resetBtn.addEventListener("click", () => {
    state.keyword = "";
    state.category = "all";
    state.maxPrice = 250;
    state.channels = new Set(["official", "marketplace", "affiliate"]);
    state.aiPrompt = "";

    keywordInput.value = "";
    categorySelect.value = "all";
    priceRange.value = 250;
    priceValue.textContent = "$250";
    channelCheckboxes.forEach((box) => (box.checked = true));
    aiInput.value = "";
    aiReply.textContent =
      "Describe what you need, your style, or a problem to solve—no exact keywords required.";
    activeAiPill.classList.add("hidden");

    renderAll();
  });

  aiForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const prompt = aiInput.value.trim();
    if (!prompt) return;
    runPreviewAiSearch(prompt);
  });

  document.querySelectorAll(".prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt;
      aiInput.value = prompt;
      runPreviewAiSearch(prompt);
    });
  });

  clearAiBtn.addEventListener("click", () => {
    state.aiPrompt = "";
    aiInput.value = "";
    activeAiPill.classList.add("hidden");
    aiReply.textContent = "AI filter cleared. Showing standard filtered catalog.";
    renderAll();
  });

  closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });
}

// Simulated frontend semantic scoring (replace with FastAPI POST /search later)
function computeMockSimilarity(product, prompt) {
  const tokens = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (tokens.length === 0) return 0;

  const corpus = `${product.title} ${product.category} ${product.description} ${product.tags.join(" ")}`.toLowerCase();
  let hits = 0;
  tokens.forEach((token) => {
    if (corpus.includes(token)) hits += 1;
  });

  const ratio = hits / tokens.length;
  return hits > 0 ? Math.min(98, Math.round(62 + ratio * 36)) : 0;
}

function runPreviewAiSearch(prompt) {
  state.aiPrompt = prompt;
  activeAiText.textContent = `AI Intent: "${prompt}"`;
  activeAiPill.classList.remove("hidden");

  const filtered = getFilteredProducts();
  if (filtered.length > 0) {
    aiReply.textContent = `Found ${filtered.length} matching option(s) ranked by contextual similarity.`;
  } else {
    aiReply.textContent =
      "No exact match under your current price/channel filters. Try widening the left filters.";
  }

  renderAll();
}

function getFilteredProducts() {
  let list = state.products.filter((item) => {
    const matchesCategory = state.category === "all" || item.category === state.category;
    const matchesPrice = item.price <= state.maxPrice;
    const matchesChannel = state.channels.has(item.channel);
    const matchesKeyword =
      !state.keyword ||
      item.title.toLowerCase().includes(state.keyword) ||
      item.description.toLowerCase().includes(state.keyword);

    return matchesCategory && matchesPrice && matchesChannel && matchesKeyword;
  });

  if (state.aiPrompt) {
    list = list
      .map((item) => ({
        ...item,
        matchScore: computeMockSimilarity(item, state.aiPrompt)
      }))
      .filter((item) => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  return list;
}

function renderAll() {
  const results = getFilteredProducts();
  renderResults(results);
  renderRecommendations(results);
}

function renderResults(items) {
  resultsTitle.textContent = state.aiPrompt ? "AI Ranked Matches" : "Catalog Results";
  resultsSubtitle.textContent = `Showing ${items.length} product${items.length === 1 ? "" : "s"}`;

  if (items.length === 0) {
    resultsGrid.innerHTML = `
      <div class="empty-state">
        <p><strong>No products match your current criteria.</strong></p>
        <p style="font-size: 0.85rem; margin-top: 0.35rem;">Adjust your filters or ask the AI assistant on the left.</p>
      </div>
    `;
    return;
  }

  resultsGrid.innerHTML = items
    .map(
      (item) => `
      <article class="product-card">
        <div class="card-media">
          <img src="${item.image}" alt="${item.title}" loading="lazy" />
          <span class="channel-tag">${item.channel}</span>
          ${item.matchScore ? `<span class="match-tag">${item.matchScore}% Match</span>` : ""}
        </div>
        <div class="card-body">
          <span class="card-category">${item.category}</span>
          <h3 class="card-title">${item.title}</h3>
          <p class="card-desc">${item.description}</p>
          <div class="card-footer">
            <span class="card-price">$${item.price}</span>
            <button class="inspect-btn" type="button" onclick="openProductModal(${item.id})">
              Details
            </button>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

function renderRecommendations(currentResults) {
  let recs = [];

  // Prioritize complements from viewed items (algorithmic memory simulation)
  if (state.viewedIds.length > 0) {
    const lastViewed = state.products.find((p) => p.id === state.viewedIds[state.viewedIds.length - 1]);
    if (lastViewed && lastViewed.complements) {
      recs = state.products
        .filter((p) => lastViewed.complements.includes(p.id))
        .map((p) => ({ ...p, reason: `Pairs with ${lastViewed.title}` }));
    }
  }

  // Fallback recommendations if no history yet
  if (recs.length === 0) {
    const visibleIds = new Set(currentResults.map((r) => r.id));
    const pool = state.products.filter((p) => !visibleIds.has(p.id));
    const source = pool.length >= 3 ? pool : state.products;
    recs = source.slice(0, 3).map((p) => ({
      ...p,
      reason: "Popular in your segment"
    }));
  }

  recommendationsGrid.innerHTML = recs
    .map(
      (item) => `
      <div class="rec-card" onclick="openProductModal(${item.id})">
        <img src="${item.image}" alt="${item.title}" />
        <div class="rec-info">
          <div class="rec-reason">${item.reason}</div>
          <div class="rec-title">${item.title}</div>
          <div class="rec-price">$${item.price} · ${item.category}</div>
        </div>
      </div>
    `
    )
    .join("");
}

window.openProductModal = function (productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  if (!state.viewedIds.includes(productId)) {
    state.viewedIds.push(productId);
    renderRecommendations(getFilteredProducts());
  }

  const complements = state.products.filter((p) => (product.complements || []).includes(p.id));

  modalBody.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <img src="${product.image}" alt="${product.title}" style="width:100%; height:210px; object-fit:cover; border-radius:10px;" />
      <div>
        <span class="card-category">${product.category} · ${product.channel}</span>
        <h3 style="font-size:1.2rem; margin-top:0.2rem;">${product.title}</h3>
        <p style="font-size:1.1rem; font-weight:700; margin-top:0.25rem;">$${product.price}</p>
      </div>
      <p style="font-size:0.88rem; color:var(--text-secondary);">${product.description}</p>
      ${
        complements.length > 0
          ? `
        <div style="border-top:1px solid var(--border-color); padding-top:0.85rem;">
          <p style="font-size:0.78rem; font-weight:600; text-transform:uppercase; color:var(--accent-ai); margin-bottom:0.5rem;">
            AI Cross-Sell Suggestions
          </p>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${complements
              .map(
                (c) => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; background:var(--bg-subtle); border-radius:8px; font-size:0.84rem;">
                <span><strong>${c.title}</strong> ($${c.price})</span>
                <button class="inspect-btn" type="button" onclick="openProductModal(${c.id})">View</button>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;

  modal.classList.remove("hidden");
};

init();