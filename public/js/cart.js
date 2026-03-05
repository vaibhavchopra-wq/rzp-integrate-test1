// ==========================================
// Cart Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();
});

function renderCartPage() {
  const cart = getCart();
  const cartItemsList = document.getElementById('cart-items-list');
  const summarySection = document.getElementById('cart-summary-section');
  const itemCount = document.getElementById('cart-item-count');
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  itemCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''} in your cart`;
  
  if (cart.length === 0) {
    cartItemsList.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added anything to your cart yet.</p>
        <a href="/products.html" class="btn btn-primary">Continue Shopping</a>
      </div>
    `;
    summarySection.style.display = 'none';
    return;
  }
  
  summarySection.style.display = 'block';
  
  cartItemsList.innerHTML = cart.map(item => `
    <div class="cart-item-row">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-details">
        <h4>${item.name}</h4>
        <p class="cart-item-price">${formatPrice(item.price)}</p>
      </div>
      <div class="cart-item-quantity">
        <button class="qty-btn" onclick="changeQuantity('${item.productId}', ${item.quantity - 1})">-</button>
        <span>${item.quantity}</span>
        <button class="qty-btn" onclick="changeQuantity('${item.productId}', ${item.quantity + 1})">+</button>
      </div>
      <div class="cart-item-total">
        ${formatPrice(item.price * item.quantity)}
      </div>
      <button class="cart-item-remove" onclick="removeItem('${item.productId}')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');
  
  updateSummary();
}

async function changeQuantity(productId, quantity) {
  if (quantity < 1) {
    removeItem(productId);
    return;
  }
  
  try {
    await updateCartQuantity(productId, quantity);
    renderCartPage();
  } catch (error) {
    // Error handled in common.js
  }
}

async function removeItem(productId) {
  try {
    await removeFromCart(productId);
    renderCartPage();
  } catch (error) {
    // Error handled in common.js
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
    
    saveCart(data.items);
    saveAppliedCoupon(data.coupon);
    showToast(`Coupon "${code}" applied!`, 'success');
    document.getElementById('coupon-input').value = '';
    updateSummary();
  } catch (error) {
    showToast(error.message || 'Invalid coupon code', 'error');
  }
}

function updateSummary() {
  const cart = getCart();
  const coupon = getAppliedCoupon();
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  
  if (coupon) {
    if (coupon.type === 'percentage') {
      discount = Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount || Infinity);
    } else {
      discount = coupon.value;
    }
    document.getElementById('summary-discount-row').classList.remove('hidden');
    document.getElementById('summary-discount').textContent = `-${formatPrice(Math.round(discount))}`;
    
    // Show applied coupon
    const appliedDiv = document.getElementById('applied-coupon');
    appliedDiv.classList.remove('hidden');
    appliedDiv.innerHTML = `
      <span>${coupon.code}</span>
      <button onclick="removeCoupon()">×</button>
    `;
  } else {
    document.getElementById('summary-discount-row').classList.add('hidden');
    document.getElementById('applied-coupon').classList.add('hidden');
  }
  
  const tax = Math.round((subtotal - discount) * 0.18);
  const total = subtotal - discount + tax;
  
  document.getElementById('summary-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('summary-tax').textContent = formatPrice(tax);
  document.getElementById('summary-total').textContent = formatPrice(Math.round(total));
  
  // Disable checkout if cart is empty
  const checkoutBtn = document.getElementById('checkout-btn');
  if (cart.length === 0) {
    checkoutBtn.classList.add('disabled');
    checkoutBtn.onclick = (e) => e.preventDefault();
  }
}

function removeCoupon() {
  saveAppliedCoupon(null);
  updateSummary();
  showToast('Coupon removed');
}
