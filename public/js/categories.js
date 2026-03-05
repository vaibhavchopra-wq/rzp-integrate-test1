// ==========================================
// Categories Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
});

async function loadCategories() {
  try {
    const categories = await apiRequest('/api/categories');
    renderCategories(categories);
  } catch (error) {
    document.getElementById('categories-grid').innerHTML = '<p class="empty-state">Failed to load categories</p>';
  }
}

function renderCategories(categories) {
  const grid = document.getElementById('categories-grid');
  
  if (!categories || categories.length === 0) {
    grid.innerHTML = '<p class="empty-state">No categories found</p>';
    return;
  }
  
  grid.innerHTML = categories.map(cat => `
    <a href="/products.html?category=${cat.id}" class="category-card">
      <img src="${cat.image}" alt="${cat.name}">
      <div class="category-card-content">
        <h3>${cat.name}</h3>
        <p>${cat.description}</p>
        <span class="product-count">${cat.productCount} products</span>
      </div>
    </a>
  `).join('');
}
