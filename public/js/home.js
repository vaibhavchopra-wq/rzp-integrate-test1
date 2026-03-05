// ==========================================
// Home Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadFeaturedProducts();
});

async function loadCategories() {
  try {
    const categories = await apiRequest('/api/categories');
    renderCategories(categories.slice(0, 4)); // Show only first 4
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

function renderCategories(categories) {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  
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

async function loadFeaturedProducts() {
  try {
    const products = await apiRequest('/api/products/featured');
    renderFeaturedProducts(products);
  } catch (error) {
    console.error('Failed to load featured products:', error);
  }
}

function renderFeaturedProducts(products) {
  const grid = document.getElementById('featured-products');
  if (!grid) return;
  
  grid.innerHTML = products.map(product => renderProductCard(product)).join('');
}
