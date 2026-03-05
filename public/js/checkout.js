// ==========================================
// Checkout Page JavaScript
// ==========================================

let currentStep = 1;
let selectedShippingMethod = null;
let shippingCost = 0;

document.addEventListener('DOMContentLoaded', () => {
  const cart = getCart();
  
  if (cart.length === 0) {
    window.location.href = '/cart.html';
    return;
  }
  
  loadShippingMethods();
  renderCheckoutItems();
  updateCheckoutSummary();
  
  // Pre-fill from user data if logged in
  const user = getCurrentUser();
  if (user) {
    document.getElementById('customer-name').value = user.name || '';
    document.getElementById('customer-email').value = user.email || '';
    document.getElementById('customer-phone').value = user.phone || '';
  }
});

function renderCheckoutItems() {
  const cart = getCart();
  const container = document.getElementById('checkout-items');
  
  container.innerHTML = cart.map(item => `
    <div class="checkout-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="checkout-item-info">
        <div class="checkout-item-name">${item.name}</div>
        <div class="checkout-item-qty">Qty: ${item.quantity}</div>
      </div>
      <div class="checkout-item-price">${formatPrice(item.price * item.quantity)}</div>
    </div>
  `).join('');
}

function updateCheckoutSummary() {
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
    document.getElementById('checkout-discount-row').style.display = 'flex';
    document.getElementById('checkout-discount').textContent = `-${formatPrice(Math.round(discount))}`;
  } else {
    document.getElementById('checkout-discount-row').style.display = 'none';
  }
  
  const tax = Math.round((subtotal - discount) * 0.18);
  const total = subtotal - discount + tax + shippingCost;
  
  document.getElementById('checkout-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('checkout-shipping').textContent = shippingCost === 0 ? 'Free' : formatPrice(shippingCost);
  document.getElementById('checkout-tax').textContent = formatPrice(tax);
  document.getElementById('checkout-total').textContent = formatPrice(Math.round(total));
  document.getElementById('payment-total').textContent = formatPrice(Math.round(total));
  
  // Store for payment
  localStorage.setItem('paymentAmount', Math.round(total));
}

async function loadShippingMethods() {
  try {
    const methods = await apiRequest('/api/shipping/methods');
    renderShippingMethods(methods);
  } catch (error) {
    document.getElementById('shipping-methods').innerHTML = '<p>Failed to load shipping options</p>';
  }
}

function renderShippingMethods(methods) {
  const container = document.getElementById('shipping-methods');
  
  container.innerHTML = methods.map((method, i) => `
    <label class="shipping-option ${i === 0 ? 'selected' : ''}">
      <input type="radio" name="shipping" value="${method.id}" ${i === 0 ? 'checked' : ''} 
             onchange="selectShippingMethod('${method.id}', ${method.price})">
      <div class="shipping-option-info">
        <div class="shipping-option-name">${method.name}</div>
        <div class="shipping-option-time">${method.estimatedDays}</div>
      </div>
      <div class="shipping-option-price">${method.price === 0 ? 'Free' : formatPrice(method.price)}</div>
    </label>
  `).join('');
  
  // Select first method by default
  if (methods.length > 0) {
    selectShippingMethod(methods[0].id, methods[0].price);
  }
}

function selectShippingMethod(methodId, price) {
  selectedShippingMethod = methodId;
  shippingCost = price;
  
  document.querySelectorAll('.shipping-option').forEach(opt => {
    opt.classList.toggle('selected', opt.querySelector('input').value === methodId);
  });
  
  updateCheckoutSummary();
}

async function calculateShipping() {
  const pincode = document.getElementById('shipping-pincode').value;
  if (!pincode || pincode.length < 5) return;
  
  try {
    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const weight = cart.reduce((sum, item) => sum + (item.quantity * 0.5), 0);
    
    const methods = await apiRequest('/api/shipping/calculate', {
      method: 'POST',
      body: JSON.stringify({ pincode, subtotal, weight })
    });
    
    const container = document.getElementById('shipping-methods');
    container.innerHTML = methods.map((method, i) => `
      <label class="shipping-option ${i === 0 ? 'selected' : ''}">
        <input type="radio" name="shipping" value="${method.id}" ${i === 0 ? 'checked' : ''} 
               onchange="selectShippingMethod('${method.id}', ${method.calculatedPrice})">
        <div class="shipping-option-info">
          <div class="shipping-option-name">${method.name}</div>
          <div class="shipping-option-time">${method.estimatedDays}</div>
        </div>
        <div class="shipping-option-price">${method.calculatedPrice === 0 ? 'Free' : formatPrice(method.calculatedPrice)}</div>
      </label>
    `).join('');
    
    if (methods.length > 0) {
      selectShippingMethod(methods[0].id, methods[0].calculatedPrice);
    }
  } catch (error) {
    console.error('Failed to calculate shipping:', error);
  }
}

function goToStep(step) {
  // Validate current step before proceeding
  if (step > currentStep) {
    if (currentStep === 1 && !validateShippingForm()) {
      return;
    }
  }
  
  currentStep = step;
  
  // Update step indicators
  document.querySelectorAll('.checkout-step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.checkout-steps-bar .step').forEach((s, i) => {
    s.classList.remove('active');
    if (i + 1 < step) s.classList.add('completed');
  });
  
  document.getElementById(`step-${step}`).classList.add('active');
  document.querySelector(`.checkout-steps-bar .step[data-step="${step}"]`).classList.add('active');
  
  // Populate review step
  if (step === 2) {
    renderReviewStep();
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateShippingForm() {
  const required = ['customer-name', 'customer-email', 'customer-phone', 'shipping-line1', 'shipping-city', 'shipping-state', 'shipping-pincode'];
  
  for (const id of required) {
    const input = document.getElementById(id);
    if (!input.value.trim()) {
      input.focus();
      showToast('Please fill in all required fields', 'error');
      return false;
    }
  }
  
  // Validate email
  const email = document.getElementById('customer-email').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address', 'error');
    return false;
  }
  
  // Validate phone
  const phone = document.getElementById('customer-phone').value;
  if (!/^\d{10}$/.test(phone.replace(/[^0-9]/g, ''))) {
    showToast('Please enter a valid 10-digit phone number', 'error');
    return false;
  }
  
  return true;
}

function renderReviewStep() {
  const cart = getCart();
  
  // Render items
  document.getElementById('review-items').innerHTML = cart.map(item => `
    <div class="review-item">
      <img src="${item.image}" alt="${item.name}">
      <div>
        <div>${item.name}</div>
        <div class="review-item-qty">Qty: ${item.quantity} × ${formatPrice(item.price)}</div>
      </div>
      <div>${formatPrice(item.price * item.quantity)}</div>
    </div>
  `).join('');
  
  // Render address
  const address = {
    name: document.getElementById('customer-name').value,
    email: document.getElementById('customer-email').value,
    phone: document.getElementById('customer-phone').value,
    line1: document.getElementById('shipping-line1').value,
    line2: document.getElementById('shipping-line2').value,
    city: document.getElementById('shipping-city').value,
    state: document.getElementById('shipping-state').value,
    pincode: document.getElementById('shipping-pincode').value
  };
  
  document.getElementById('review-address').innerHTML = `
    <p><strong>${address.name}</strong></p>
    <p>${address.line1}${address.line2 ? ', ' + address.line2 : ''}</p>
    <p>${address.city}, ${address.state} - ${address.pincode}</p>
    <p>Phone: ${address.phone}</p>
    <p>Email: ${address.email}</p>
  `;
  
  // Render shipping method
  const selectedOption = document.querySelector('input[name="shipping"]:checked');
  if (selectedOption) {
    const label = selectedOption.closest('.shipping-option');
    const name = label.querySelector('.shipping-option-name').textContent;
    const time = label.querySelector('.shipping-option-time').textContent;
    const price = label.querySelector('.shipping-option-price').textContent;
    
    document.getElementById('review-shipping').innerHTML = `
      <p><strong>${name}</strong> - ${price}</p>
      <p>${time}</p>
    `;
  }
}

// Payment Integration Point
// This function will be called when user clicks "Pay Now"
// Payment gateway integration (Razorpay/Stripe) should be added here
async function initiatePayment() {
  const cart = getCart();
  const coupon = getAppliedCoupon();
  
  // Gather order data
  const orderData = {
    items: cart,
    customerInfo: {
      name: document.getElementById('customer-name').value,
      email: document.getElementById('customer-email').value,
      phone: document.getElementById('customer-phone').value
    },
    shippingAddress: {
      line1: document.getElementById('shipping-line1').value,
      line2: document.getElementById('shipping-line2').value,
      city: document.getElementById('shipping-city').value,
      state: document.getElementById('shipping-state').value,
      pincode: document.getElementById('shipping-pincode').value
    },
    shippingMethod: selectedShippingMethod,
    couponCode: coupon?.code,
    paymentMethod: 'cod' // Default to COD, will be updated by payment gateway
  };
  
  // Store order data for payment callback
  localStorage.setItem('pendingOrder', JSON.stringify(orderData));
  
  // Calculate total for payment
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  if (coupon) {
    discount = coupon.type === 'percentage' 
      ? Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount || Infinity)
      : coupon.value;
  }
  const tax = Math.round((subtotal - discount) * 0.18);
  const total = Math.round(subtotal - discount + tax + shippingCost);
  
  // Store customer info for payment prefill
  localStorage.setItem('customerInfo', JSON.stringify(orderData.customerInfo));
  localStorage.setItem('paymentAmount', total);
  
  // ============================================
  // PAYMENT GATEWAY INTEGRATION POINT
  // ============================================
  // Add Razorpay/Stripe integration here
  // The payment gateway should:
  // 1. Create an order on the backend
  // 2. Open payment modal/redirect
  // 3. On success, call completeOrder()
  // 4. On failure, show error message
  // ============================================
  
  // For now, create order with COD
  try {
    const response = await apiRequest('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    
    // Clear cart and redirect
    localStorage.removeItem('cart');
    localStorage.removeItem('appliedCoupon');
    localStorage.removeItem('pendingOrder');
    
    showToast('Order placed successfully!', 'success');
    
    // Redirect to orders page after short delay
    setTimeout(() => {
      window.location.href = '/orders.html';
    }, 1500);
    
  } catch (error) {
    showToast('Failed to place order: ' + error.message, 'error');
  }
}

// Call this after successful payment
function completeOrder(paymentId, paymentMethod = 'online') {
  const orderData = JSON.parse(localStorage.getItem('pendingOrder'));
  if (!orderData) return;
  
  orderData.paymentMethod = paymentMethod;
  orderData.paymentId = paymentId;
  
  apiRequest('/api/orders/create', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }).then(() => {
    localStorage.removeItem('cart');
    localStorage.removeItem('appliedCoupon');
    localStorage.removeItem('pendingOrder');
    
    showToast('Order placed successfully!', 'success');
    setTimeout(() => {
      window.location.href = '/orders.html';
    }, 1500);
  }).catch(error => {
    showToast('Failed to complete order', 'error');
  });
}
