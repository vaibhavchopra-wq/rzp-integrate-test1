// ==========================================
// TechStore E-commerce Frontend Application
// ==========================================

const API_URL = '';

// ===== State Management =====
let cart = [];
let wishlist = [];
let products = [];
let categories = [];
let currentUser = null;
let currentPage = 1;
let selectedShippingMethod = null;
let appliedCoupon = null;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  loadCartFromStorage();
  loadWishlistFromStorage();
  loadUserFromStorage();
  
  await Promise.all([
    loadCategories(),
    loadFeaturedProducts(),
    loadProducts()
  ]);
  
  updateStats();
  updateCartUI();
  updateWishlistUI();
  updateUserUI();
  setupSearchListeners();
}

// ===== API Helpers =====
// Get or create session ID for cart operations
function getSessionId() {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': getSessionId(),
        ...options.headers
      },
      ...options
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// ===== Categories =====
async function loadCategories() {
  try {
    const data = await apiRequest('/api/categories');
    categories = data;
    renderCategories();
    populateCategoryFilter();
  } catch (error) {
    showToast('Failed to load categories', 'error');
  }
}

function renderCategories() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  
  grid.innerHTML = categories.map(cat => `
    <div class="category-card" onclick="filterByCategory('${cat.id}')">
      <img src="${cat.image}" alt="${cat.name}">
      <div class="category-card-content">
        <h3>${cat.name}</h3>
        <p>${cat.description}</p>
        <span class="product-count">${cat.productCount} products</span>
      </div>
    </div>
  `).join('');
}

function populateCategoryFilter() {
  const filter = document.getElementById('category-filter');
  if (!filter) return;
  
  filter.innerHTML = '<option value="">All Categories</option>' +
    categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

function filterByCategory(categoryId) {
  document.getElementById('category-filter').value = categoryId;
  showSection('products-section');
  filterProducts();
}

// ===== Products =====
async function loadProducts(page = 1) {
  try {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 12);
    
    const categoryFilter = document.getElementById('category-filter')?.value;
    const sortFilter = document.getElementById('sort-filter')?.value;
    const minPrice = document.getElementById('min-price')?.value;
    const maxPrice = document.getElementById('max-price')?.value;
    
    if (categoryFilter) params.set('category', categoryFilter);
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
    
    renderProducts('products-grid', products);
    renderPagination(data.totalPages);
  } catch (error) {
    showToast('Failed to load products', 'error');
  }
}

async function loadFeaturedProducts() {
  try {
    const data = await apiRequest('/api/products/featured');
    renderProducts('featured-products', data);
  } catch (error) {
    console.error('Failed to load featured products:', error);
  }
}

function renderProducts(containerId, productList) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!productList || productList.length === 0) {
    container.innerHTML = '<p class="empty-state">No products found</p>';
    return;
  }
  
  container.innerHTML = productList.map(product => {
    const inWishlist = wishlist.some(w => w.id === product.id);
    const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;
    
    return `
      <div class="product-card">
        <div class="product-image">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-badges">
            ${product.isFeatured ? '<span class="product-badge featured">Featured</span>' : ''}
            ${discount > 0 ? `<span class="product-badge sale">${discount}% OFF</span>` : ''}
            ${product.stock < 5 && product.stock > 0 ? '<span class="product-badge low-stock">Low Stock</span>' : ''}
          </div>
          <div class="product-actions">
            <button class="product-action-btn ${inWishlist ? 'in-wishlist' : ''}" 
                    onclick="toggleWishlist('${product.id}')" title="Add to Wishlist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button class="product-action-btn" onclick="openProductModal('${product.id}')" title="Quick View">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>
        <div class="product-info">
          <span class="product-category">${product.category || 'Electronics'}</span>
          <h3 class="product-name" onclick="openProductModal('${product.id}')">${product.name}</h3>
          <div class="product-rating">
            <span class="stars">${getStarRating(product.rating || 4)}</span>
            <span class="rating-count">(${product.reviewCount || 0})</span>
          </div>
          <div class="product-price">
            <span class="price-current">₹${product.price.toLocaleString()}</span>
            ${product.comparePrice ? `
              <span class="price-original">₹${product.comparePrice.toLocaleString()}</span>
              <span class="price-discount">Save ${discount}%</span>
            ` : ''}
          </div>
          <button class="btn btn-primary" onclick="addToCart('${product.id}')" ${product.stock === 0 ? 'disabled' : ''}>
            ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    `;
  }).join('');
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

function getStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let stars = '★'.repeat(fullStars);
  if (hasHalf) stars += '½';
  stars += '☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0));
  return stars;
}

// ===== Product Detail Modal =====
async function openProductModal(productId) {
  try {
    const product = await apiRequest(`/api/products/${productId}`);
    const inWishlist = wishlist.some(w => w.id === product.id);
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
          <span class="price-current">₹${product.price.toLocaleString()}</span>
          ${product.comparePrice ? `
            <span class="price-original">₹${product.comparePrice.toLocaleString()}</span>
            <span class="price-discount">Save ${discount}%</span>
          ` : ''}
        </div>
        <p class="product-detail-description">${product.description}</p>
        <div class="product-detail-meta">
          ${product.sku ? `<div class="meta-item"><span class="meta-label">SKU</span><span>${product.sku}</span></div>` : ''}
          ${product.stock !== undefined ? `<div class="meta-item"><span class="meta-label">Availability</span><span>${product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}</span></div>` : ''}
          ${product.tags && product.tags.length ? `<div class="meta-item"><span class="meta-label">Tags</span><span>${product.tags.join(', ')}</span></div>` : ''}
        </div>
        <div class="product-detail-actions">
          <button class="btn btn-primary" onclick="addToCart('${product.id}'); closeProductModal();" ${product.stock === 0 ? 'disabled' : ''}>
            ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button class="btn ${inWishlist ? 'btn-danger' : 'btn-secondary'}" onclick="toggleWishlist('${product.id}')">
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

// ===== Cart Functions =====
async function addToCart(productId) {
  try {
    const data = await apiRequest('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity: 1 })
    });
    
    cart = data.items;
    appliedCoupon = data.coupon;
    saveCartToStorage();
    updateCartUI();
    showToast('Added to cart!', 'success');
  } catch (error) {
    showToast('Failed to add to cart', 'error');
  }
}

async function updateCartQuantity(productId, quantity) {
  try {
    const data = await apiRequest('/api/cart/update', {
      method: 'PUT',
      body: JSON.stringify({ productId, quantity })
    });
    
    cart = data.items;
    appliedCoupon = data.coupon;
    saveCartToStorage();
    updateCartUI();
  } catch (error) {
    showToast('Failed to update cart', 'error');
  }
}

async function removeFromCart(productId) {
  try {
    const data = await apiRequest('/api/cart/remove', {
      method: 'DELETE',
      body: JSON.stringify({ productId })
    });
    
    cart = data.items;
    appliedCoupon = data.coupon;
    saveCartToStorage();
    updateCartUI();
    showToast('Removed from cart');
  } catch (error) {
    showToast('Failed to remove from cart', 'error');
  }
}

async function applyCoupon() {
  const code = document.getElementById('coupon-input').value.trim();
  if (!code) return;
  
  try {
    const data = await apiRequest('/api/cart/apply-coupon', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    
    appliedCoupon = data.coupon;
    cart = data.items;
    updateCartUI();
    showToast(`Coupon "${code}" applied!`, 'success');
    document.getElementById('coupon-input').value = '';
  } catch (error) {
    showToast(error.message || 'Invalid coupon code', 'error');
  }
}

function updateCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  
  if (cart.length === 0) {
    cartItems.innerHTML = '<div class="empty-cart"><p>Your cart is empty</p></div>';
    document.getElementById('cart-subtotal').textContent = '₹0';
    document.getElementById('cart-tax').textContent = '₹0';
    document.getElementById('cart-total').textContent = '₹0';
    document.getElementById('discount-row').classList.add('hidden');
    return;
  }
  
  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price.toLocaleString()}</div>
        <div class="cart-item-quantity">
          <button class="qty-btn" onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})">+</button>
          <button class="remove-btn" onclick="removeFromCart('${item.productId}')">Remove</button>
        </div>
      </div>
    </div>
  `).join('');
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discount = Math.min(subtotal * (appliedCoupon.value / 100), appliedCoupon.maxDiscount || Infinity);
    } else {
      discount = appliedCoupon.value;
    }
    document.getElementById('discount-row').classList.remove('hidden');
    document.getElementById('cart-discount').textContent = `-₹${discount.toLocaleString()}`;
  } else {
    document.getElementById('discount-row').classList.add('hidden');
  }
  
  const tax = (subtotal - discount) * 0.18;
  const total = subtotal - discount + tax;
  
  document.getElementById('cart-subtotal').textContent = `₹${subtotal.toLocaleString()}`;
  document.getElementById('cart-tax').textContent = `₹${tax.toFixed(0).toLocaleString()}`;
  document.getElementById('cart-total').textContent = `₹${total.toFixed(0).toLocaleString()}`;
}

function openCart() {
  document.getElementById('cart-overlay').classList.remove('hidden');
  document.getElementById('cart-sidebar').classList.add('open');
}

function closeCart() {
  document.getElementById('cart-overlay').classList.add('hidden');
  document.getElementById('cart-sidebar').classList.remove('open');
}

// ===== Wishlist Functions =====
function toggleWishlist(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  const index = wishlist.findIndex(w => w.id === productId);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast('Removed from wishlist');
  } else {
    wishlist.push(product);
    showToast('Added to wishlist!', 'success');
  }
  
  saveWishlistToStorage();
  updateWishlistUI();
  
  // Re-render products to update wishlist icons
  if (products.length > 0) {
    renderProducts('products-grid', products);
  }
}

function updateWishlistUI() {
  const wishlistCount = document.getElementById('wishlist-count');
  const wishlistItems = document.getElementById('wishlist-items');
  
  wishlistCount.textContent = wishlist.length;
  
  if (wishlist.length === 0) {
    wishlistItems.innerHTML = '<div class="empty-cart"><p>Your wishlist is empty</p></div>';
    return;
  }
  
  wishlistItems.innerHTML = wishlist.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price.toLocaleString()}</div>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button class="btn btn-sm btn-primary" onclick="addToCart('${item.id}')">Add to Cart</button>
          <button class="btn btn-sm btn-secondary" onclick="toggleWishlist('${item.id}')">Remove</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openWishlist() {
  document.getElementById('wishlist-overlay').classList.remove('hidden');
  document.getElementById('wishlist-sidebar').classList.add('open');
}

function closeWishlist() {
  document.getElementById('wishlist-overlay').classList.add('hidden');
  document.getElementById('wishlist-sidebar').classList.remove('open');
}

// ===== Search Functions =====
function setupSearchListeners() {
  const searchInput = document.getElementById('search-input');
  let debounceTimeout;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      document.getElementById('search-suggestions').classList.remove('active');
      return;
    }
    
    debounceTimeout = setTimeout(() => loadSearchSuggestions(query), 300);
  });
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
      document.getElementById('search-suggestions').classList.remove('active');
    }
  });
}

async function loadSearchSuggestions(query) {
  try {
    const data = await apiRequest(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
    const suggestions = document.getElementById('search-suggestions');
    
    if (data.length === 0) {
      suggestions.classList.remove('active');
      return;
    }
    
    suggestions.innerHTML = data.map(item => `
      <div class="suggestion-item" onclick="selectSuggestion('${item.name}')">
        ${item.name}
      </div>
    `).join('');
    suggestions.classList.add('active');
  } catch (error) {
    console.error('Search suggestions error:', error);
  }
}

function selectSuggestion(name) {
  document.getElementById('search-input').value = name;
  document.getElementById('search-suggestions').classList.remove('active');
  performSearch();
}

async function performSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;
  
  document.getElementById('search-suggestions').classList.remove('active');
  
  try {
    const data = await apiRequest(`/api/search?q=${encodeURIComponent(query)}`);
    
    document.getElementById('search-title').textContent = `Search Results for "${query}"`;
    renderProducts('search-results', data.products);
    showSection('search-section');
  } catch (error) {
    showToast('Search failed', 'error');
  }
}

// ===== Checkout Functions =====
function openCheckoutModal() {
  if (cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }
  
  closeCart();
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('checkout-modal').classList.remove('hidden');
  goToStep(1);
  loadShippingMethods();
}

function closeCheckoutModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('checkout-modal').classList.add('hidden');
}

async function loadShippingMethods() {
  try {
    const data = await apiRequest('/api/shipping/methods');
    const container = document.getElementById('shipping-methods');
    
    container.innerHTML = data.map((method, i) => `
      <label class="shipping-option ${i === 0 ? 'selected' : ''}">
        <input type="radio" name="shipping" value="${method.id}" ${i === 0 ? 'checked' : ''} onchange="selectShippingMethod('${method.id}', ${method.price})">
        <div class="shipping-option-info">
          <div class="shipping-option-name">${method.name}</div>
          <div class="shipping-option-time">${method.estimatedDays}</div>
        </div>
        <div class="shipping-option-price">${method.price === 0 ? 'Free' : `₹${method.price}`}</div>
      </label>
    `).join('');
    
    if (data.length > 0) {
      selectShippingMethod(data[0].id, data[0].price);
    }
  } catch (error) {
    console.error('Failed to load shipping methods:', error);
  }
}

function selectShippingMethod(methodId, price) {
  selectedShippingMethod = { id: methodId, price };
  
  document.querySelectorAll('.shipping-option').forEach(opt => {
    opt.classList.toggle('selected', opt.querySelector('input').value === methodId);
  });
}

async function calculateShipping() {
  const pincode = document.getElementById('shipping-pincode').value;
  if (!pincode || pincode.length < 5) return;
  
  try {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const weight = cart.reduce((sum, item) => sum + (item.quantity * 0.5), 0);
    
    const data = await apiRequest('/api/shipping/calculate', {
      method: 'POST',
      body: JSON.stringify({ pincode, subtotal, weight })
    });
    
    const container = document.getElementById('shipping-methods');
    container.innerHTML = data.map((method, i) => `
      <label class="shipping-option ${i === 0 ? 'selected' : ''}">
        <input type="radio" name="shipping" value="${method.id}" ${i === 0 ? 'checked' : ''} onchange="selectShippingMethod('${method.id}', ${method.calculatedPrice})">
        <div class="shipping-option-info">
          <div class="shipping-option-name">${method.name}</div>
          <div class="shipping-option-time">${method.estimatedDays}</div>
        </div>
        <div class="shipping-option-price">${method.calculatedPrice === 0 ? 'Free' : `₹${method.calculatedPrice}`}</div>
      </label>
    `).join('');
    
    if (data.length > 0) {
      selectShippingMethod(data[0].id, data[0].calculatedPrice);
    }
  } catch (error) {
    console.error('Failed to calculate shipping:', error);
  }
}

function goToStep(step) {
  document.querySelectorAll('.checkout-step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.step').forEach(s => {
    s.classList.remove('active');
    if (parseInt(s.dataset.step) < step) s.classList.add('completed');
  });
  
  document.getElementById(`step-${step}`).classList.add('active');
  document.querySelector(`.step[data-step="${step}"]`).classList.add('active');
  
  if (step === 2) {
    renderOrderReview();
  } else if (step === 3) {
    renderFinalSummary();
  }
}

function renderOrderReview() {
  const review = document.getElementById('order-review');
  
  const itemsHtml = cart.map(item => `
    <div class="order-review-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="order-review-info">
        <div class="order-review-name">${item.name}</div>
        <div class="order-review-qty">Qty: ${item.quantity}</div>
      </div>
      <div class="order-review-price">₹${(item.price * item.quantity).toLocaleString()}</div>
    </div>
  `).join('');
  
  const name = document.getElementById('customer-name').value;
  const email = document.getElementById('customer-email').value;
  const phone = document.getElementById('customer-phone').value;
  const line1 = document.getElementById('shipping-line1').value;
  const line2 = document.getElementById('shipping-line2').value;
  const city = document.getElementById('shipping-city').value;
  const state = document.getElementById('shipping-state').value;
  const pincode = document.getElementById('shipping-pincode').value;
  
  review.innerHTML = `
    ${itemsHtml}
    <div class="order-address">
      <h4>Shipping Address</h4>
      <p><strong>${name}</strong></p>
      <p>${line1}${line2 ? ', ' + line2 : ''}</p>
      <p>${city}, ${state} - ${pincode}</p>
      <p>Phone: ${phone}</p>
      <p>Email: ${email}</p>
    </div>
  `;
}

function renderFinalSummary() {
  const summary = document.getElementById('order-summary-final');
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discount = Math.min(subtotal * (appliedCoupon.value / 100), appliedCoupon.maxDiscount || Infinity);
    } else {
      discount = appliedCoupon.value;
    }
  }
  
  const shipping = selectedShippingMethod?.price || 0;
  const tax = (subtotal - discount) * 0.18;
  const total = subtotal - discount + tax + shipping;
  
  summary.innerHTML = `
    <div class="cart-summary" style="background: var(--gray-50); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <div class="summary-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString()}</span></div>
      ${discount > 0 ? `<div class="summary-row discount-row"><span>Discount (${appliedCoupon.code})</span><span>-₹${discount.toLocaleString()}</span></div>` : ''}
      <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : `₹${shipping.toLocaleString()}`}</span></div>
      <div class="summary-row"><span>Tax (18%)</span><span>₹${tax.toFixed(0).toLocaleString()}</span></div>
      <div class="summary-row total"><span>Total</span><span>₹${total.toFixed(0).toLocaleString()}</span></div>
    </div>
  `;
}

async function handleCheckout() {
  const name = document.getElementById('customer-name').value;
  const email = document.getElementById('customer-email').value;
  const phone = document.getElementById('customer-phone').value;
  
  if (!name || !email || !phone) {
    showToast('Please fill in all required fields', 'error');
    goToStep(1);
    return;
  }
  
  // Store customer info for order creation
  localStorage.setItem('customerInfo', JSON.stringify({ name, email, phone }));
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discount = Math.min(subtotal * (appliedCoupon.value / 100), appliedCoupon.maxDiscount || Infinity);
    } else {
      discount = appliedCoupon.value;
    }
  }
  const shipping = selectedShippingMethod?.price || 0;
  const tax = (subtotal - discount) * 0.18;
  const total = subtotal - discount + tax + shipping;
  
  // Store payment amount for payment integration
  localStorage.setItem('paymentAmount', Math.round(total));
  
  // Create order
  try {
    const orderData = {
      items: cart,
      customerInfo: { name, email, phone },
      shippingAddress: {
        line1: document.getElementById('shipping-line1').value,
        line2: document.getElementById('shipping-line2').value,
        city: document.getElementById('shipping-city').value,
        state: document.getElementById('shipping-state').value,
        pincode: document.getElementById('shipping-pincode').value
      },
      shippingMethod: selectedShippingMethod?.id,
      couponCode: appliedCoupon?.code,
      paymentMethod: 'cod' // Will be updated when payment is integrated
    };
    
    const response = await apiRequest('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    
    // Clear cart
    cart = [];
    appliedCoupon = null;
    saveCartToStorage();
    updateCartUI();
    
    closeCheckoutModal();
    showToast('Order placed successfully!', 'success');
    loadOrders();
    showSection('orders-section');
  } catch (error) {
    showToast('Failed to create order: ' + error.message, 'error');
  }
}

// ===== Orders Functions =====
async function loadOrders() {
  try {
    const data = await apiRequest('/api/orders');
    const ordersList = document.getElementById('orders-list');
    
    if (!data.orders || data.orders.length === 0) {
      ordersList.innerHTML = '<p class="empty-state">No orders yet. Start shopping!</p>';
      return;
    }
    
    ordersList.innerHTML = data.orders.map(order => `
      <div class="order-card">
        <div class="order-header">
          <div>
            <div class="order-id">Order #${order.orderId}</div>
            <div class="order-date">${new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
          <span class="order-status ${order.status}">${order.status}</span>
        </div>
        <div class="order-items">
          ${order.items.slice(0, 3).map(item => `
            <img class="order-item-thumb" src="${item.image}" alt="${item.name}" title="${item.name}">
          `).join('')}
          ${order.items.length > 3 ? `<span>+${order.items.length - 3} more</span>` : ''}
        </div>
        <div class="order-footer">
          <span class="order-total">₹${order.total.toLocaleString()}</span>
          <button class="btn btn-sm btn-secondary" onclick="trackOrder('${order.orderId}')">Track Order</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load orders:', error);
  }
}

async function trackOrder(orderId) {
  try {
    const data = await apiRequest(`/api/orders/${orderId}/track`);
    showToast(`Order Status: ${data.status}`, 'success');
  } catch (error) {
    showToast('Failed to get order tracking', 'error');
  }
}

// ===== Auth Functions =====
function showAuthModal(type) {
  document.getElementById('auth-modal').classList.remove('hidden');
  document.getElementById('user-menu').classList.add('hidden');
  
  if (type === 'login') {
    document.getElementById('login-form-container').classList.remove('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
  } else {
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.remove('hidden');
  }
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    currentUser = data.user;
    saveUserToStorage();
    updateUserUI();
    closeAuthModal();
    showToast('Logged in successfully!', 'success');
  } catch (error) {
    showToast(error.message || 'Login failed', 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;
  
  try {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password })
    });
    
    currentUser = data.user;
    saveUserToStorage();
    updateUserUI();
    closeAuthModal();
    showToast('Registered successfully!', 'success');
  } catch (error) {
    showToast(error.message || 'Registration failed', 'error');
  }
}

async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    // Ignore logout API errors
  }
  
  currentUser = null;
  localStorage.removeItem('user');
  updateUserUI();
  showToast('Logged out successfully');
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  menu.classList.toggle('hidden');
}

function updateUserUI() {
  const guestMenu = document.getElementById('guest-menu');
  const userMenu = document.getElementById('user-logged-menu');
  const userName = document.getElementById('user-name');
  
  if (currentUser) {
    guestMenu.classList.add('hidden');
    userMenu.classList.remove('hidden');
    userName.textContent = currentUser.name;
  } else {
    guestMenu.classList.remove('hidden');
    userMenu.classList.add('hidden');
  }
}

// ===== Storage Functions =====
function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const stored = localStorage.getItem('cart');
  cart = stored ? JSON.parse(stored) : [];
}

function saveWishlistToStorage() {
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

function loadWishlistFromStorage() {
  const stored = localStorage.getItem('wishlist');
  wishlist = stored ? JSON.parse(stored) : [];
}

function saveUserToStorage() {
  localStorage.setItem('user', JSON.stringify(currentUser));
}

function loadUserFromStorage() {
  const stored = localStorage.getItem('user');
  currentUser = stored ? JSON.parse(stored) : null;
}

// ===== UI Helpers =====
function showSection(sectionId) {
  const sections = ['hero-section', 'categories-section', 'featured-section', 'products-section', 'search-section', 'orders-section'];
  
  sections.forEach(id => {
    const section = document.getElementById(id);
    if (section) {
      if (id === sectionId) {
        section.classList.remove('hidden');
      } else if (['products-section', 'search-section', 'orders-section'].includes(id)) {
        section.classList.add('hidden');
      }
    }
  });
  
  if (sectionId === 'orders-section') {
    loadOrders();
  }
  
  // Scroll to section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function updateStats() {
  document.getElementById('stat-products').textContent = products.length || '0';
  document.getElementById('stat-categories').textContent = categories.length || '0';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-btn') && !e.target.closest('.user-menu')) {
    document.getElementById('user-menu')?.classList.add('hidden');
  }
});
