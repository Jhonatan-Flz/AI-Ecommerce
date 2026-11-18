const API_BASE = "http://127.0.0.1:8000/api";

const state = {
  keyword: "",
  category: "all",
  maxPrice: 250,
  channels: new Set(["official", "marketplace", "affiliate"]),
  aiPrompt: "",
  viewedIds: []
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
const aiStatus = document.getElementById("ai-status");
const activeAiPill = document.getElementById("active-ai-pill");
const activeAiText = document.getElementById("active-ai-text");
const clearAiBtn = document.getElementById("clear-ai-btn");

// Modal Elements
const modal = document.getElementById("product-modal");
const modalBody = document.getElementById("modal-body");
const closeModalBtn = document.getElementById("close-modal-btn");

function setText(el, text) {
  if (el) el.textContent = text;
}

async function init() {
  bindEvents();
  await checkServerHealth();
  await fetchCatalog();
}

async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      setText(aiStatus, "Local AI Ready");
    }
  } catch {
    setText(aiStatus, "API Offline");
  }
}

function bindEvents() {
  if (keywordInput) {
    keywordInput.addEventListener("input", (e) => {
      state.keyword = e.target.value.trim();
      fetchCatalog();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", (e) => {
      state.category = e.target.value;
      fetchCatalog();
    });
  }

  if (priceRange) {
    priceRange.addEventListener("input", (e) => {
      state.maxPrice = Number(e.target.value);
      setText(priceValue, `$${state.maxPrice}`);
      fetchCatalog();
    });
  }

  channelCheckboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      state.channels.clear();
      channelCheckboxes.forEach((box) => {
        if (box.checked) state.channels.add(box.value);
      });
      fetchCatalog();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.keyword = "";
      state.category = "all";
      state.maxPrice = 250;
      state.channels = new Set(["official", "marketplace", "affiliate"]);
      state.aiPrompt = "";

      if (keywordInput) keywordInput.value = "";
      if (categorySelect) categorySelect.value = "all";
      if (priceRange) priceRange.value = 250;
      setText(priceValue, "$250");
      channelCheckboxes.forEach((box) => (box.checked = true));
      if (aiInput) aiInput.value = "";
      setText(
        aiReply,
        "Describe what you need, your style, or a problem to solve—no exact keywords required."
      );
      if (activeAiPill) activeAiPill.classList.add("hidden");

      fetchCatalog();
    });
  }

  if (aiForm) {
    aiForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!aiInput) return;

      const prompt = aiInput.value.trim();
      if (!prompt) return;

      state.aiPrompt = prompt;
      setText(activeAiText, `AI Intent: "${prompt}"`);
      if (activeAiPill) activeAiPill.classList.remove("hidden");
      setText(aiReply, "Analyzing semantic similarity...");

      const count = await fetchCatalog();
      if (count > 0) {
        setText(aiReply, `Found ${count} matching option(s) ranked by vector similarity.`);
      } else {
        setText(
          aiReply,
          "No semantic matches under your current price or channel filters. Try widening the left filters."
        );
      }
    });
  }

  if (clearAiBtn) {
    clearAiBtn.addEventListener("click", () => {
      state.aiPrompt = "";
      if (aiInput) aiInput.value = "";
      if (activeAiPill) activeAiPill.classList.add("hidden");
      setText(aiReply, "AI filter cleared. Showing standard filtered catalog.");
      fetchCatalog();
    });
  }

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }
}

async function fetchCatalog() {
  try {
    const response = await fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: state.aiPrompt,
        keyword: state.keyword,
        category: state.category,
        max_price: state.maxPrice,
        channels: Array.from(state.channels),
        viewed_ids: state.viewedIds
      })
    });

    if (!response.ok) throw new Error("Search request failed");

    const data = await response.json();
    renderResults(data.results || []);
    renderRecommendations(data.recommendations || []);
    return (data.results || []).length;
  } catch (error) {
    if (resultsGrid) {
      resultsGrid.innerHTML = `
        <div class="empty-state">
          <p><strong>Backend server is not running.</strong></p>
          <p style="font-size: 0.85rem; margin-top: 0.35rem;">
            Start FastAPI with <code>uvicorn main:app --reload</code> inside <code>backend/</code>.
          </p>
        </div>
      `;
    }
    return 0;
  }
}

function renderResults(items) {
  setText(resultsTitle, state.aiPrompt ? "AI Ranked Matches" : "Catalog Results");
  setText(resultsSubtitle, `Showing ${items.length} product${items.length === 1 ? "" : "s"}`);

  if (!resultsGrid) return;

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

function renderRecommendations(recs) {
  if (!recommendationsGrid) return;

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

window.openProductModal = async function (productId) {
  try {
    const response = await fetch(`${API_BASE}/products/${productId}`);
    if (!response.ok) return;

    const { product, complements } = await response.json();

    if (!state.viewedIds.includes(productId)) {
      state.viewedIds.push(productId);
      fetchCatalog();
    }

    if (modalBody && modal) {
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
                AI Vector Cross-Sell Suggestions
              </p>
              <div style="display:flex; flex-direction:column; gap:0.5rem;">
                ${complements
                  .map(
                    (c) => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; background:var(--bg-subtle); border-radius:8px; font-size:0.84rem;">
                    <span><strong>${c.title}</strong> · ${c.category} ($${c.price})</span>
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
    }
  } catch (error) {
    console.error("Failed to fetch product details:", error);
  }
};

init();