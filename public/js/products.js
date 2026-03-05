// ==========================================
// Products Page JavaScript
// ==========================================

let products = [];
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  
  // Check for search query in URL
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('search');
  const categoryFilter = urlParams.get('category');
  
  if (searchQuery) {
    document.getElementById('search-input').value = searchQuery;
  }
  if (categoryFilter) {
    document.getElementById('category-filter').value = categoryFilter;
  }
  
  loadProducts();
});

async function loadCategories() {
  try {
    const data = await apiRequest('/api/categories');
    const filter = document.getElementById('category-filter');
    filter.innerHTML = '<option value="">All Categories</option>' +
      data.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    
    // Set selected category if in URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('category');
    if (categoryFilter) {
      filter.value = categoryFilter;
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

async function loadProducts(page = 1) {
  try {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 12);
    
    const categoryFilter = document.getElementById('category-filter')?.value;
    const sortFilter = document.getElementById('sort-filter')?.value;
    const minPrice = document.getElementById('min-price')?.value;
    const maxPrice = document.getElementById('max-price')?.value;
    const searchQuery = document.getElementById('search-input')?.value;
    
    if (categoryFilter) params.set('category', categoryFilter);
    if (searchQuery) params.set('search', searchQuery);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (sortFilter) {
      if (sortFilter === 'price_asc') {
        params.set('sortBy', 'price');
        params.set('sortOrder', 'asc');
      } else if (sortFilter === 'price_desc') {
        params.set('sortBy', 'price');
        params.set('sortOrder', 'desc');
      } else if (sortFilter === 'rating') {
        params.set('sortBy', 'rating');
      } else if (sortFilter === 'newest') {
        params.set('sortBy', 'createdAt');
      }
    }
    
    const data = await apiRequest(`/api/products?${params.toString()}`);
    products = data.products;
    currentPage = data.page;
    
    renderProducts();
    renderPagination(data.totalPages);
  } catch (error) {
    showToast('Failed to load products', 'error');
    document.getElementById('products-grid').innerHTML = '<p class="empty-state">Failed to load products</p>';
  }
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  
  if (!products || products.length === 0) {
    grid.innerHTML = '<p class="empty-state">No products found</p>';
    return;
  }
  
  grid.innerHTML = products.map(product => renderProductCard(product)).join('');
}

function renderCurrentProducts() {
  renderProducts();
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (!pagination || totalPages <= 1) {
    if (pagination) pagination.innerHTML = '';
    return;
  }
  
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  pagination.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadProducts(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterProducts() {
  currentPage = 1;
  loadProducts(1);
}

// Product Modal Functions
async function openProductModal(productId) {
  try {
    const product = await apiRequest(`/api/products/${productId}`);
    const inWishlist = isInWishlist(product.id);
    const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;
    
    const content = document.getElementById('product-detail-content');
    content.innerHTML = `
      <div class="product-detail-images">
        <img class="product-detail-main-image" src="${product.image}" alt="${product.name}">
        ${product.images && product.images.length > 1 ? `
          <div class="product-detail-thumbnails">
            ${product.images.map((img, i) => `
              <img src="${img}" alt="" class="${i === 0 ? 'active' : ''}" onclick="changeMainImage(this, '${img}')">
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="product-detail-info">
        <span class="product-category">${product.category || 'Electronics'}</span>
        <h1>${product.name}</h1>
        <div class="product-rating">
          <span class="stars">${getStarRating(product.rating || 4)}</span>
          <span class="rating-count">(${product.reviewCount || 0} reviews)</span>
        </div>
        <div class="product-price">
          <span class="price-current">${formatPrice(product.price)}</span>
          ${product.comparePrice ? `
            <span class="price-original">${formatPrice(product.comparePrice)}</span>
            <span class="price-discount">Save ${discount}%</span>
          ` : ''}
        </div>
        <p class="product-detail-description">${product.description}</p>
        <div class="product-detail-meta">
          ${product.sku ? `<div class="meta-item"><span class="meta-label">SKU</span><span>${product.sku}</span></div>` : ''}
          ${product.stock !== undefined ? `<div class="meta-item"><span class="meta-label">Availability</span><span>${product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}</span></div>` : ''}
        </div>
        <div class="product-detail-actions">
          <button class="btn btn-primary" onclick="addToCart('${product.id}'); closeProductModal();" ${product.stock === 0 ? 'disabled' : ''}>
            ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button class="btn ${inWishlist ? 'btn-danger' : 'btn-secondary'}" onclick="toggleWishlistFromCard('${product.id}')">
            ${inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('product-modal').classList.remove('hidden');
  } catch (error) {
    showToast('Failed to load product details', 'error');
  }
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
}

function changeMainImage(thumb, src) {
  document.querySelector('.product-detail-main-image').src = src;
  document.querySelectorAll('.product-detail-thumbnails img').forEach(img => img.classList.remove('active'));
  thumb.classList.add('active');
}
