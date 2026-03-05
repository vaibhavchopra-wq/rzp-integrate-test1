// ==========================================
// Wishlist Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  renderWishlist();
});

function renderWishlist() {
  const wishlist = getWishlist();
  const grid = document.getElementById('wishlist-grid');
  const itemCount = document.getElementById('wishlist-item-count');
  
  itemCount.textContent = `${wishlist.length} item${wishlist.length !== 1 ? 's' : ''} saved`;
  
  if (wishlist.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <h3>Your wishlist is empty</h3>
        <p>Save items you like by clicking the heart icon on products.</p>
        <a href="/products.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = wishlist.map(product => renderWishlistCard(product)).join('');
}

function renderWishlistCard(product) {
  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;
  
  return `
    <div class="product-card wishlist-card">
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}">
        ${discount > 0 ? `<span class="product-badge sale">${discount}% OFF</span>` : ''}
        <button class="wishlist-remove-btn" onclick="removeFromWishlist('${product.id}')" title="Remove from Wishlist">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="product-info">
        <span class="product-category">${product.category || 'Electronics'}</span>
        <h3 class="product-name">${product.name}</h3>
        <div class="product-rating">
          <span class="stars">${getStarRating(product.rating || 4)}</span>
          <span class="rating-count">(${product.reviewCount || 0})</span>
        </div>
        <div class="product-price">
          <span class="price-current">${formatPrice(product.price)}</span>
          ${product.comparePrice ? `<span class="price-original">${formatPrice(product.comparePrice)}</span>` : ''}
        </div>
        <button class="btn btn-primary" onclick="addToCartFromWishlist('${product.id}')" ${product.stock === 0 ? 'disabled' : ''}>
          ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `;
}

function removeFromWishlist(productId) {
  let wishlist = getWishlist();
  wishlist = wishlist.filter(w => w.id !== productId);
  saveWishlist(wishlist);
  showToast('Removed from wishlist');
  renderWishlist();
}

async function addToCartFromWishlist(productId) {
  await addToCart(productId);
  // Optionally remove from wishlist after adding to cart
  // removeFromWishlist(productId);
}
