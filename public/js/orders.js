// ==========================================
// Orders Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
});

async function loadOrders() {
  try {
    const status = document.getElementById('order-status-filter')?.value;
    let url = '/api/orders';
    if (status) {
      url += `?status=${status}`;
    }
    
    const data = await apiRequest(url);
    renderOrders(data.orders || []);
  } catch (error) {
    document.getElementById('orders-list').innerHTML = '<p class="empty-state">Failed to load orders</p>';
  }
}

function renderOrders(orders) {
  const container = document.getElementById('orders-list');
  
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <h3>No orders yet</h3>
        <p>When you place orders, they'll appear here.</p>
        <a href="/products.html" class="btn btn-primary">Start Shopping</a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">Order #${order.orderId || order.orderNumber}</div>
          <div class="order-date">${new Date(order.createdAt).toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</div>
        </div>
        <span class="order-status ${order.status}">${order.status}</span>
      </div>
      <div class="order-items">
        ${order.items.slice(0, 4).map(item => `
          <img class="order-item-thumb" src="${item.image}" alt="${item.name}" title="${item.name}">
        `).join('')}
        ${order.items.length > 4 ? `<span class="more-items">+${order.items.length - 4} more</span>` : ''}
      </div>
      <div class="order-footer">
        <div>
          <span class="order-total">${formatPrice(order.total)}</span>
          <span class="order-items-count">${order.items.length} item${order.items.length > 1 ? 's' : ''}</span>
        </div>
        <div class="order-actions">
          <button class="btn btn-sm btn-outline" onclick="viewOrderDetails('${order.orderId}')">View Details</button>
          ${order.status === 'pending' ? `
            <button class="btn btn-sm btn-danger" onclick="cancelOrder('${order.orderId}')">Cancel</button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function filterOrders() {
  loadOrders();
}

async function viewOrderDetails(orderId) {
  try {
    const order = await apiRequest(`/api/orders/${orderId}/track`);
    showToast(`Order Status: ${order.status}`, 'info');
  } catch (error) {
    showToast('Failed to load order details', 'error');
  }
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  
  try {
    await apiRequest(`/api/orders/${orderId}/cancel`, {
      method: 'POST'
    });
    showToast('Order cancelled successfully', 'success');
    loadOrders();
  } catch (error) {
    showToast('Failed to cancel order', 'error');
  }
}
