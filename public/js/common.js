// ==========================================
// TechStore - Common JavaScript Functions
// ==========================================

const API_URL = '';

// ===== Session & Storage =====
function getSessionId() {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

function getCart() {
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}

function getWishlist() {
  const wishlist = localStorage.getItem('wishlist');
  return wishlist ? JSON.parse(wishlist) : [];
}

function saveWishlist(wishlist) {
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  updateWishlistBadge();
}

function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function saveCurrentUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

function getAppliedCoupon() {
  const coupon = localStorage.getItem('appliedCoupon');
  return coupon ? JSON.parse(coupon) : null;
}

function saveAppliedCoupon(coupon) {
  if (coupon) {
    localStorage.setItem('appliedCoupon', JSON.stringify(coupon));
  } else {
    localStorage.removeItem('appliedCoupon');
  }
}

// ===== API Helper =====
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

// ===== Badge Updates =====
function updateCartBadge() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function updateWishlistBadge() {
  const wishlist = getWishlist();
  const badge = document.getElementById('wishlist-count');
  if (badge) {
    badge.textContent = wishlist.length;
    badge.style.display = wishlist.length > 0 ? 'flex' : 'none';
  }
}

// ===== Cart Functions =====
async function addToCart(productId) {
  try {
    const data = await apiRequest('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity: 1 })
    });
    
    saveCart(data.items);
    if (data.coupon) {
      saveAppliedCoupon(data.coupon);
    }
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
    
    saveCart(data.items);
    return data;
  } catch (error) {
    showToast('Failed to update cart', 'error');
    throw error;
  }
}

async function removeFromCart(productId) {
  try {
    const data = await apiRequest('/api/cart/remove', {
      method: 'DELETE',
      body: JSON.stringify({ productId })
    });
    
    saveCart(data.items);
    showToast('Removed from cart');
    return data;
  } catch (error) {
    showToast('Failed to remove from cart', 'error');
    throw error;
  }
}

// ===== Wishlist Functions =====
function toggleWishlist(productId, product = null) {
  let wishlist = getWishlist();
  const index = wishlist.findIndex(w => w.id === productId);
  
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast('Removed from wishlist');
  } else {
    if (product) {
      wishlist.push(product);
    } else {
      // Fetch product details if not provided
      apiRequest(`/api/products/${productId}`)
        .then(p => {
          wishlist.push(p);
          saveWishlist(wishlist);
        });
      return;
    }
    showToast('Added to wishlist!', 'success');
  }
  
  saveWishlist(wishlist);
}

function isInWishlist(productId) {
  const wishlist = getWishlist();
  return wishlist.some(w => w.id === productId);
}

// ===== Search =====
function performSearch() {
  const query = document.getElementById('search-input')?.value.trim();
  if (query) {
    window.location.href = `/products.html?search=${encodeURIComponent(query)}`;
  }
}

// Setup search on enter key
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }
  
  // Update badges on page load
  updateCartBadge();
  updateWishlistBadge();
});

// ===== UI Helpers =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

function getStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let stars = '★'.repeat(fullStars);
  if (hasHalf) stars += '½';
  stars += '☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0));
  return stars;
}

function formatPrice(price) {
  return '₹' + price.toLocaleString('en-IN');
}

// ===== Product Card Renderer =====
function renderProductCard(product) {
  const inWishlist = isInWishlist(product.id);
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
                  onclick="toggleWishlistFromCard('${product.id}')" title="Add to Wishlist">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          <button class="product-action-btn" onclick="window.location.href='/product.html?id=${product.id}'" title="View Details">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>
      <div class="product-info">
        <span class="product-category">${product.category || 'Electronics'}</span>
        <h3 class="product-name" onclick="window.location.href='/product.html?id=${product.id}'">${product.name}</h3>
        <div class="product-rating">
          <span class="stars">${getStarRating(product.rating || 4)}</span>
          <span class="rating-count">(${product.reviewCount || 0})</span>
        </div>
        <div class="product-price">
          <span class="price-current">${formatPrice(product.price)}</span>
          ${product.comparePrice ? `
            <span class="price-original">${formatPrice(product.comparePrice)}</span>
            <span class="price-discount">Save ${discount}%</span>
          ` : ''}
        </div>
        <button class="btn btn-primary" onclick="addToCart('${product.id}')" ${product.stock === 0 ? 'disabled' : ''}>
          ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `;
}

// Wishlist toggle that fetches product if needed
async function toggleWishlistFromCard(productId) {
  let wishlist = getWishlist();
  const index = wishlist.findIndex(w => w.id === productId);
  
  if (index > -1) {
    wishlist.splice(index, 1);
    saveWishlist(wishlist);
    showToast('Removed from wishlist');
    // Re-render if on products page
    if (typeof renderCurrentProducts === 'function') {
      renderCurrentProducts();
    }
  } else {
    try {
      const product = await apiRequest(`/api/products/${productId}`);
      wishlist.push(product);
      saveWishlist(wishlist);
      showToast('Added to wishlist!', 'success');
      if (typeof renderCurrentProducts === 'function') {
        renderCurrentProducts();
      }
    } catch (error) {
      showToast('Failed to add to wishlist', 'error');
    }
  }
}
