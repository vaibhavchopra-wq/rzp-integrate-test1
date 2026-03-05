const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data imports
const products = require('./data/products');
const categories = require('./data/categories');
const users = require('./data/users');
const coupons = require('./data/coupons');
const reviews = require('./data/reviews');
const shippingData = require('./data/shipping');

// In-memory stores
const carts = new Map();
const orders = new Map();
const sessions = new Map();
const wishlistStore = new Map();
const notifications = new Map();

// ============================================
// CATEGORY ROUTES
// ============================================
app.get('/api/categories', (req, res) => {
  res.json(categories);
});

app.get('/api/categories/:id', (req, res) => {
  const category = categories.find(c => c.id === req.params.id || c.slug === req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  const categoryProducts = products.filter(p => p.category === category.id);
  res.json({ ...category, products: categoryProducts });
});

// ============================================
// PRODUCT ROUTES
// ============================================
app.get('/api/products', (req, res) => {
  let result = [...products];
  const { category, search, minPrice, maxPrice, sortBy, sortOrder, featured, limit, page, tags } = req.query;

  if (category) {
    result = result.filter(p => p.category === category);
  }
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(p => 
      p.name.toLowerCase().includes(searchLower) || 
      p.description.toLowerCase().includes(searchLower) ||
      p.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }
  if (minPrice) {
    result = result.filter(p => p.price >= parseInt(minPrice));
  }
  if (maxPrice) {
    result = result.filter(p => p.price <= parseInt(maxPrice));
  }
  if (featured === 'true') {
    result = result.filter(p => p.isFeatured);
  }
  if (tags) {
    const tagList = tags.split(',');
    result = result.filter(p => p.tags.some(t => tagList.includes(t)));
  }
  
  // Sorting
  if (sortBy) {
    switch (sortBy) {
      case 'price':
        result.sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);
        break;
      case 'name':
        result.sort((a, b) => sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'createdAt':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }
  }

  const total = result.length;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 12;
  const totalPages = Math.ceil(total / limitNum);
  const offset = (pageNum - 1) * limitNum;
  result = result.slice(offset, offset + limitNum);

  res.json({ products: result, total, page: pageNum, totalPages, limit: limitNum });
});

app.get('/api/products/featured', (req, res) => {
  const featured = products.filter(p => p.isFeatured && p.isActive);
  res.json(featured);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id || p.slug === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  const productReviews = reviews.filter(r => r.productId === product.id);
  const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  res.json({ ...product, reviews: productReviews, relatedProducts });
});

app.get('/api/products/:id/reviews', (req, res) => {
  const productReviews = reviews.filter(r => r.productId === req.params.id);
  const avgRating = productReviews.length > 0 
    ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length 
    : 0;
  res.json({ success: true, data: { reviews: productReviews, averageRating: avgRating, totalReviews: productReviews.length } });
});

app.post('/api/products/:id/reviews', (req, res) => {
  const { userId, rating, title, comment } = req.body;
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  const newReview = {
    id: `rev_${uuidv4().substring(0, 8)}`,
    productId: req.params.id,
    userId,
    rating,
    title,
    comment,
    helpful: 0,
    createdAt: new Date().toISOString()
  };
  reviews.push(newReview);
  res.status(201).json({ success: true, data: newReview });
});

app.get('/api/products/:id/stock', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  res.json({ success: true, data: { productId: product.id, stock: product.stock, available: product.stock > 0 } });
});

// ============================================
// AUTH ROUTES
// ============================================
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, error: 'Email already registered' });
  }
  const newUser = {
    id: `user_${uuidv4().substring(0, 8)}`,
    email,
    password: `hashed_${password}`,
    name,
    phone,
    role: 'customer',
    addresses: [],
    wishlist: [],
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  const token = `token_${uuidv4()}`;
  sessions.set(token, newUser.id);
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ success: true, data: { user: userWithoutPassword, token } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || user.password !== `hashed_${password}`) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  const token = `token_${uuidv4()}`;
  sessions.set(token, user.id);
  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, data: { user: userWithoutPassword, token } });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = sessions.get(token);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  const user = users.find(u => u.id === userId);
  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

// ============================================
// USER PROFILE ROUTES
// ============================================
app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

app.patch('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  const { name, phone } = req.body;
  if (name) user.name = name;
  if (phone) user.phone = phone;
  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

app.get('/api/users/:id/addresses', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: user.addresses });
});

app.post('/api/users/:id/addresses', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  const newAddress = {
    id: `addr_${uuidv4().substring(0, 8)}`,
    ...req.body,
    isDefault: user.addresses.length === 0
  };
  user.addresses.push(newAddress);
  res.status(201).json({ success: true, data: newAddress });
});

app.put('/api/users/:id/addresses/:addressId', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  const addressIndex = user.addresses.findIndex(a => a.id === req.params.addressId);
  if (addressIndex === -1) {
    return res.status(404).json({ success: false, error: 'Address not found' });
  }
  user.addresses[addressIndex] = { ...user.addresses[addressIndex], ...req.body };
  res.json({ success: true, data: user.addresses[addressIndex] });
});

app.delete('/api/users/:id/addresses/:addressId', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  user.addresses = user.addresses.filter(a => a.id !== req.params.addressId);
  res.json({ success: true, message: 'Address deleted' });
});

// ============================================
// WISHLIST ROUTES
// ============================================
app.get('/api/wishlist', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const wishlist = wishlistStore.get(sessionId) || [];
  const wishlistProducts = products.filter(p => wishlist.includes(p.id));
  res.json({ success: true, data: wishlistProducts });
});

app.post('/api/wishlist/add', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { productId } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  let wishlist = wishlistStore.get(sessionId) || [];
  if (!wishlist.includes(productId)) {
    wishlist.push(productId);
    wishlistStore.set(sessionId, wishlist);
  }
  res.json({ success: true, data: { productId, added: true } });
});

app.delete('/api/wishlist/remove/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  let wishlist = wishlistStore.get(sessionId) || [];
  wishlist = wishlist.filter(id => id !== req.params.productId);
  wishlistStore.set(sessionId, wishlist);
  res.json({ success: true, data: { productId: req.params.productId, removed: true } });
});

app.get('/api/wishlist/check/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const wishlist = wishlistStore.get(sessionId) || [];
  res.json({ success: true, data: { productId: req.params.productId, inWishlist: wishlist.includes(req.params.productId) } });
});

// ============================================
// CART ROUTES
// ============================================
app.get('/api/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'] || uuidv4();
  let cart = carts.get(sessionId);
  if (!cart) {
    cart = { items: [], sessionId, appliedCoupon: null };
    carts.set(sessionId, cart);
  }
  res.json({ success: true, data: calculateCartTotals(cart) });
});

app.post('/api/cart/add', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const sessionId = req.headers['x-session-id'] || uuidv4();
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  if (product.stock < quantity) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }
  let cart = carts.get(sessionId);
  if (!cart) {
    cart = { items: [], sessionId, appliedCoupon: null };
  }
  const existingItem = cart.items.find(item => item.productId === productId);
  if (existingItem) {
    if (product.stock < existingItem.quantity + quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ 
      productId, 
      quantity, 
      name: product.name,
      price: product.price,
      image: product.image
    });
  }
  carts.set(sessionId, cart);
  res.setHeader('x-session-id', sessionId);
  res.json({ items: cart.items, coupon: cart.appliedCoupon });
});

app.put('/api/cart/update', (req, res) => {
  const { productId, quantity } = req.body;
  const sessionId = req.headers['x-session-id'] || uuidv4();
  let cart = carts.get(sessionId);
  if (!cart) {
    cart = { items: [], sessionId, appliedCoupon: null };
  }
  const itemIndex = cart.items.findIndex(item => item.productId === productId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found in cart' });
  }
  if (quantity <= 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    const product = products.find(p => p.id === productId);
    if (product && product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    cart.items[itemIndex].quantity = quantity;
  }
  carts.set(sessionId, cart);
  res.json({ items: cart.items, coupon: cart.appliedCoupon });
});

app.delete('/api/cart/remove', (req, res) => {
  const sessionId = req.headers['x-session-id'] || uuidv4();
  const { productId } = req.body;
  let cart = carts.get(sessionId);
  if (!cart) {
    cart = { items: [], sessionId, appliedCoupon: null };
  }
  cart.items = cart.items.filter(item => item.productId !== productId);
  carts.set(sessionId, cart);
  res.json({ items: cart.items, coupon: cart.appliedCoupon });
});

app.delete('/api/cart/clear', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    carts.delete(sessionId);
  }
  res.json({ items: [], coupon: null });
});

// ============================================
// COUPON ROUTES
// ============================================
app.get('/api/coupons', (req, res) => {
  const activeCoupons = coupons.filter(c => c.isActive).map(c => ({
    code: c.code,
    type: c.type,
    value: c.value,
    minOrderAmount: c.minOrderAmount,
    maxDiscount: c.maxDiscount,
    validUntil: c.validUntil
  }));
  res.json({ success: true, data: activeCoupons });
});

app.post('/api/coupons/validate', (req, res) => {
  const { code, cartTotal } = req.body;
  const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
  if (!coupon) {
    return res.status(404).json({ success: false, error: 'Invalid coupon code' });
  }
  if (!coupon.isActive) {
    return res.status(400).json({ success: false, error: 'Coupon is no longer active' });
  }
  const now = new Date();
  if (new Date(coupon.validFrom) > now || new Date(coupon.validUntil) < now) {
    return res.status(400).json({ success: false, error: 'Coupon has expired' });
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({ success: false, error: 'Coupon usage limit reached' });
  }
  if (cartTotal < coupon.minOrderAmount) {
    return res.status(400).json({ success: false, error: `Minimum order amount is ₹${coupon.minOrderAmount}` });
  }
  let discount = coupon.type === 'percentage' ? (cartTotal * coupon.value / 100) : coupon.value;
  discount = Math.min(discount, coupon.maxDiscount);
  res.json({ success: true, data: { coupon: { code: coupon.code, type: coupon.type, value: coupon.value }, discount: Math.round(discount) } });
});

app.post('/api/cart/apply-coupon', (req, res) => {
  const sessionId = req.headers['x-session-id'] || uuidv4();
  const { code } = req.body;
  let cart = carts.get(sessionId);
  if (!cart) {
    cart = { items: [], sessionId, appliedCoupon: null };
  }
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.isActive);
  if (!coupon) {
    return res.status(404).json({ error: 'Invalid coupon code' });
  }
  if (subtotal < coupon.minOrderAmount) {
    return res.status(400).json({ error: `Minimum order amount is ₹${coupon.minOrderAmount}` });
  }
  cart.appliedCoupon = coupon.code;
  carts.set(sessionId, cart);
  res.json({ items: cart.items, coupon: { code: coupon.code, type: coupon.type, value: coupon.value, maxDiscount: coupon.maxDiscount } });
});

app.delete('/api/cart/remove-coupon', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  let cart = carts.get(sessionId);
  if (!cart) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }
  cart.appliedCoupon = null;
  carts.set(sessionId, cart);
  res.json({ success: true, data: calculateCartTotals(cart) });
});

// ============================================
// SHIPPING ROUTES
// ============================================
app.get('/api/shipping/methods', (req, res) => {
  const methods = shippingData.methods.map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    price: m.price,
    estimatedDays: m.description
  }));
  res.json(methods);
});

app.post('/api/shipping/calculate', (req, res) => {
  const { pincode, subtotal, weight } = req.body;
  let zone = shippingData.zones.find(z => z.pincodePatterns.some(p => pincode.startsWith(p)));
  if (!zone) {
    zone = shippingData.zones.find(z => z.isDefault);
  }
  const availableMethods = shippingData.methods.map(method => {
    let price = method.price * zone.multiplier;
    if (method.minOrderAmount && subtotal >= method.minOrderAmount) {
      price = 0;
    }
    if (weight && weight > 1) {
      price += Math.ceil(weight - 1) * 20;
    }
    return { 
      id: method.id, 
      name: method.name, 
      estimatedDays: method.description,
      calculatedPrice: Math.round(price), 
      zone: zone.name 
    };
  });
  res.json(availableMethods);
});

app.post('/api/shipping/estimate', (req, res) => {
  const { pincode, methodId } = req.body;
  const method = shippingData.methods.find(m => m.id === methodId);
  if (!method) {
    return res.status(404).json({ error: 'Shipping method not found' });
  }
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + method.estimatedDays.min);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + method.estimatedDays.max);
  res.json({ method: method.name, estimatedDelivery: { from: minDate.toISOString(), to: maxDate.toISOString() } });
});

// ============================================
// ORDER ROUTES
// ============================================
app.post('/api/orders/create', (req, res) => {
  const { items, customerInfo, shippingAddress, shippingMethod, billingAddress, couponCode, paymentMethod } = req.body;
  
  // Check if items provided directly in body or use session cart
  let orderItems = items;
  let appliedCoupon = null;
  
  if (!orderItems || orderItems.length === 0) {
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      const cart = carts.get(sessionId);
      if (cart && cart.items.length > 0) {
        orderItems = cart.items;
        appliedCoupon = cart.appliedCoupon;
      }
    }
  }
  
  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({ error: 'No items in order' });
  }
  
  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = 0;
  
  if (couponCode) {
    const coupon = coupons.find(c => c.code === couponCode && c.isActive);
    if (coupon && subtotal >= coupon.minOrderAmount) {
      if (coupon.type === 'percentage') {
        discount = Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount || Infinity);
      } else {
        discount = coupon.value;
      }
      appliedCoupon = coupon;
    }
  }
  
  const tax = Math.round((subtotal - discount) * 0.18);
  const shipping = shippingData.methods.find(m => m.id === shippingMethod) || shippingData.methods[0];
  const shippingCost = shipping.price;
  const total = subtotal - discount + tax + shippingCost;
  
  const orderId = `order_${uuidv4().substring(0, 8)}`;
  const order = {
    orderId,
    orderNumber: `ORD-${Date.now()}`,
    items: orderItems,
    customerInfo,
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    shippingMethod: { id: shipping.id, name: shipping.name, price: shippingCost },
    subtotal,
    discount: Math.round(discount),
    tax,
    shippingCost,
    total: Math.round(total),
    currency: 'INR',
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: paymentMethod || 'cod',
    appliedCoupon,
    timeline: [{ status: 'created', timestamp: new Date().toISOString(), note: 'Order placed' }],
    createdAt: new Date().toISOString()
  };
  orders.set(orderId, order);
  
  // Clear session cart if used
  const sessionId = req.headers['x-session-id'];
  if (sessionId && carts.has(sessionId)) {
    carts.delete(sessionId);
  }
  
  res.json(order);
});

app.get('/api/orders', (req, res) => {
  const { userId, status, limit, offset } = req.query;
  let orderList = Array.from(orders.values());
  if (userId) {
    orderList = orderList.filter(o => o.customerInfo?.userId === userId);
  }
  if (status) {
    orderList = orderList.filter(o => o.status === status);
  }
  orderList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = orderList.length;
  const offsetNum = parseInt(offset) || 0;
  const limitNum = parseInt(limit) || 10;
  orderList = orderList.slice(offsetNum, offsetNum + limitNum);
  res.json({ orders: orderList, total, offset: offsetNum, limit: limitNum });
});

app.get('/api/orders/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

app.patch('/api/orders/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  const allowedUpdates = ['status', 'paymentStatus', 'paymentId', 'paymentMethod', 'trackingNumber'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      order[field] = req.body[field];
    }
  });
  if (req.body.status) {
    order.timeline.push({ status: req.body.status, timestamp: new Date().toISOString(), note: req.body.note || '' });
  }
  order.updatedAt = new Date().toISOString();
  orders.set(req.params.orderId, order);
  res.json({ success: true, data: order });
});

app.post('/api/orders/:orderId/cancel', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  if (!['pending', 'confirmed'].includes(order.status)) {
    return res.status(400).json({ success: false, error: 'Order cannot be cancelled' });
  }
  order.status = 'cancelled';
  order.timeline.push({ status: 'cancelled', timestamp: new Date().toISOString(), note: req.body.reason || 'Cancelled by user' });
  order.updatedAt = new Date().toISOString();
  orders.set(req.params.orderId, order);
  res.json({ success: true, data: order });
});

app.get('/api/orders/:orderId/track', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ orderId: order.orderId, status: order.status, trackingNumber: order.trackingNumber, timeline: order.timeline });
});

// ============================================
// NOTIFICATIONS ROUTES
// ============================================
app.get('/api/notifications', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const userNotifications = notifications.get(sessionId) || [];
  res.json({ success: true, data: userNotifications });
});

app.post('/api/notifications/subscribe', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { email, preferences } = req.body;
  res.json({ success: true, data: { subscribed: true, email, preferences } });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  res.json({ success: true, data: { id: req.params.id, read: true } });
});

// ============================================
// ADMIN ROUTES
// ============================================
app.get('/api/admin/stats', (req, res) => {
  const orderList = Array.from(orders.values());
  const totalRevenue = orderList.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.total, 0);
  const stats = {
    totalProducts: products.length,
    totalOrders: orderList.length,
    pendingOrders: orderList.filter(o => o.status === 'pending').length,
    totalRevenue,
    totalUsers: users.length,
    lowStockProducts: products.filter(p => p.stock < 10).length
  };
  res.json({ success: true, data: stats });
});

app.get('/api/admin/inventory', (req, res) => {
  const inventory = products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    price: p.price,
    status: p.stock === 0 ? 'out_of_stock' : p.stock < 10 ? 'low_stock' : 'in_stock'
  }));
  res.json({ success: true, data: inventory });
});

app.patch('/api/admin/inventory/:productId', (req, res) => {
  const product = products.find(p => p.id === req.params.productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  const { stock, price, isActive } = req.body;
  if (stock !== undefined) product.stock = stock;
  if (price !== undefined) product.price = price;
  if (isActive !== undefined) product.isActive = isActive;
  res.json({ success: true, data: product });
});

app.get('/api/admin/orders', (req, res) => {
  const { status, from, to } = req.query;
  let orderList = Array.from(orders.values());
  if (status) orderList = orderList.filter(o => o.status === status);
  if (from) orderList = orderList.filter(o => new Date(o.createdAt) >= new Date(from));
  if (to) orderList = orderList.filter(o => new Date(o.createdAt) <= new Date(to));
  res.json({ success: true, data: orderList });
});

// ============================================
// SEARCH ROUTES
// ============================================
app.get('/api/search', (req, res) => {
  const { q, type } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }
  const searchLower = q.toLowerCase();
  let results = { products: [], categories: [] };
  if (!type || type === 'products') {
    results.products = products.filter(p => 
      p.name.toLowerCase().includes(searchLower) || 
      p.description.toLowerCase().includes(searchLower)
    ).slice(0, 10);
  }
  if (!type || type === 'categories') {
    results.categories = categories.filter(c => 
      c.name.toLowerCase().includes(searchLower)
    );
  }
  res.json(results);
});

app.get('/api/search/suggestions', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json([]);
  }
  const searchLower = q.toLowerCase();
  const suggestions = products
    .filter(p => p.name.toLowerCase().includes(searchLower))
    .map(p => ({ id: p.id, name: p.name, type: 'product' }))
    .slice(0, 5);
  res.json(suggestions);
});

// ============================================
// HEALTH & MISC ROUTES
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString(), version: '2.0.0' });
});

app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      currency: 'INR',
      currencySymbol: '₹',
      taxRate: 0.18,
      minOrderAmount: 100,
      maxCartItems: 50,
      supportEmail: 'support@techstore.com',
      supportPhone: '+91 1800-123-4567'
    }
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function calculateCartTotals(cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  let discount = 0;
  if (cart.appliedCoupon) {
    const coupon = coupons.find(c => c.code === cart.appliedCoupon);
    if (coupon) {
      discount = coupon.type === 'percentage' ? (subtotal * coupon.value / 100) : coupon.value;
      discount = Math.min(discount, coupon.maxDiscount);
    }
  }
  const taxableAmount = subtotal - discount;
  const tax = Math.round(taxableAmount * 0.18);
  const total = taxableAmount + tax;
  return {
    ...cart,
    subtotal,
    discount: Math.round(discount),
    tax,
    total,
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
  };
}

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   TechStore E-Commerce API Server v2.0                            ║
║                                                                   ║
║   Server: http://localhost:${PORT}                                   ║
║                                                                   ║
║   API Endpoints:                                                  ║
║   ├─ Categories: GET /api/categories                              ║
║   ├─ Products:   GET /api/products, /api/products/:id             ║
║   ├─ Search:     GET /api/search?q=...                            ║
║   ├─ Auth:       POST /api/auth/login, /register, /logout         ║
║   ├─ Users:      GET/PATCH /api/users/:id                         ║
║   ├─ Addresses:  CRUD /api/users/:id/addresses                    ║
║   ├─ Wishlist:   GET/POST/DELETE /api/wishlist                    ║
║   ├─ Cart:       GET/POST/PUT/DELETE /api/cart                    ║
║   ├─ Coupons:    GET /api/coupons, POST /validate                 ║
║   ├─ Shipping:   GET /methods, POST /calculate                    ║
║   ├─ Orders:     CRUD /api/orders                                 ║
║   ├─ Admin:      GET /api/admin/stats, /inventory, /orders        ║
║   └─ Health:     GET /api/health, /api/config                     ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
