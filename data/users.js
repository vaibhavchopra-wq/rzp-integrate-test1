module.exports = [
  {
    id: 'user_001',
    email: 'john@example.com',
    password: 'hashed_password_123',
    name: 'John Doe',
    phone: '+91 9876543210',
    role: 'customer',
    addresses: [
      { id: 'addr_001', type: 'home', line1: '123 Main St', line2: 'Apt 4B', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', isDefault: true },
      { id: 'addr_002', type: 'work', line1: '456 Office Park', line2: 'Floor 5', city: 'Mumbai', state: 'Maharashtra', pincode: '400051', isDefault: false }
    ],
    wishlist: ['prod_001', 'prod_003'],
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'user_002',
    email: 'jane@example.com',
    password: 'hashed_password_456',
    name: 'Jane Smith',
    phone: '+91 9876543211',
    role: 'customer',
    addresses: [
      { id: 'addr_003', type: 'home', line1: '789 Park Ave', line2: '', city: 'Delhi', state: 'Delhi', pincode: '110001', isDefault: true }
    ],
    wishlist: [],
    createdAt: '2024-02-20T14:45:00Z'
  },
  {
    id: 'user_admin',
    email: 'admin@techstore.com',
    password: 'hashed_admin_pass',
    name: 'Admin User',
    phone: '+91 9999999999',
    role: 'admin',
    addresses: [],
    wishlist: [],
    createdAt: '2024-01-01T00:00:00Z'
  }
];
