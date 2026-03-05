// ==========================================
// Account Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
});

function checkAuthStatus() {
  const user = getCurrentUser();
  const guestView = document.getElementById('guest-view');
  const userView = document.getElementById('user-view');
  
  if (user) {
    guestView.classList.add('hidden');
    userView.classList.remove('hidden');
    populateUserData(user);
    loadAddresses();
  } else {
    guestView.classList.remove('hidden');
    userView.classList.add('hidden');
  }
}

function populateUserData(user) {
  document.getElementById('user-display-name').textContent = user.name;
  document.getElementById('user-display-email').textContent = user.email;
  document.getElementById('profile-name').value = user.name;
  document.getElementById('profile-email').value = user.email;
  document.getElementById('profile-phone').value = user.phone || '';
}

function showAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  
  document.querySelector(`.auth-tab[onclick="showAuthTab('${tab}')"]`).classList.add('active');
  document.getElementById(`${tab}-form`).classList.add('active');
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
    
    saveCurrentUser(data.user);
    showToast('Logged in successfully!', 'success');
    checkAuthStatus();
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
    
    saveCurrentUser(data.user);
    showToast('Account created successfully!', 'success');
    checkAuthStatus();
  } catch (error) {
    showToast(error.message || 'Registration failed', 'error');
  }
}

function logout() {
  localStorage.removeItem('user');
  showToast('Logged out successfully');
  checkAuthStatus();
}

function showAccountSection(section) {
  document.querySelectorAll('.account-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.account-nav a').forEach(a => a.classList.remove('active'));
  
  document.getElementById(`${section}-section`).classList.add('active');
  document.querySelector(`.account-nav a[href="#${section}"]`).classList.add('active');
}

async function updateProfile(event) {
  event.preventDefault();
  
  const user = getCurrentUser();
  const name = document.getElementById('profile-name').value;
  const phone = document.getElementById('profile-phone').value;
  
  try {
    const data = await apiRequest(`/api/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, phone })
    });
    
    saveCurrentUser({ ...user, name, phone });
    showToast('Profile updated successfully!', 'success');
    checkAuthStatus();
  } catch (error) {
    showToast('Failed to update profile', 'error');
  }
}

// Address Management
async function loadAddresses() {
  const user = getCurrentUser();
  if (!user) return;
  
  try {
    const data = await apiRequest(`/api/users/${user.id}/addresses`);
    renderAddresses(data.addresses || []);
  } catch (error) {
    document.getElementById('addresses-list').innerHTML = '<p>No saved addresses</p>';
  }
}

function renderAddresses(addresses) {
  const list = document.getElementById('addresses-list');
  
  if (!addresses || addresses.length === 0) {
    list.innerHTML = '<p class="no-addresses">No saved addresses yet.</p>';
    return;
  }
  
  list.innerHTML = addresses.map(addr => `
    <div class="address-card">
      <div class="address-label">${addr.label || 'Address'}</div>
      <p>${addr.line1}</p>
      ${addr.line2 ? `<p>${addr.line2}</p>` : ''}
      <p>${addr.city}, ${addr.state} - ${addr.pincode}</p>
      <div class="address-actions">
        <button class="btn btn-sm btn-outline" onclick="deleteAddress('${addr.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function showAddAddressForm() {
  document.getElementById('add-address-form').classList.remove('hidden');
}

function hideAddAddressForm() {
  document.getElementById('add-address-form').classList.add('hidden');
  // Clear form
  document.querySelectorAll('#add-address-form input').forEach(input => input.value = '');
}

async function saveAddress(event) {
  event.preventDefault();
  
  const user = getCurrentUser();
  if (!user) return;
  
  const address = {
    label: document.getElementById('address-label').value,
    line1: document.getElementById('address-line1').value,
    line2: document.getElementById('address-line2').value,
    city: document.getElementById('address-city').value,
    state: document.getElementById('address-state').value,
    pincode: document.getElementById('address-pincode').value
  };
  
  try {
    await apiRequest(`/api/users/${user.id}/addresses`, {
      method: 'POST',
      body: JSON.stringify(address)
    });
    
    showToast('Address saved!', 'success');
    hideAddAddressForm();
    loadAddresses();
  } catch (error) {
    showToast('Failed to save address', 'error');
  }
}

async function deleteAddress(addressId) {
  const user = getCurrentUser();
  if (!user) return;
  
  if (!confirm('Delete this address?')) return;
  
  try {
    await apiRequest(`/api/users/${user.id}/addresses/${addressId}`, {
      method: 'DELETE'
    });
    
    showToast('Address deleted');
    loadAddresses();
  } catch (error) {
    showToast('Failed to delete address', 'error');
  }
}
