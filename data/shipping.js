module.exports = {
  methods: [
    { id: 'ship_standard', name: 'Standard Delivery', description: '5-7 business days', price: 49, estimatedDays: { min: 5, max: 7 } },
    { id: 'ship_express', name: 'Express Delivery', description: '2-3 business days', price: 99, estimatedDays: { min: 2, max: 3 } },
    { id: 'ship_overnight', name: 'Overnight Delivery', description: 'Next business day', price: 199, estimatedDays: { min: 1, max: 1 } },
    { id: 'ship_free', name: 'Free Shipping', description: '7-10 business days (orders above ₹999)', price: 0, estimatedDays: { min: 7, max: 10 }, minOrderAmount: 999 }
  ],
  zones: [
    { id: 'zone_metro', name: 'Metro Cities', pincodePatterns: ['110', '400', '560', '600', '700'], multiplier: 1.0 },
    { id: 'zone_urban', name: 'Urban Areas', pincodePatterns: ['20', '30', '41', '50'], multiplier: 1.2 },
    { id: 'zone_rural', name: 'Rural Areas', pincodePatterns: [], multiplier: 1.5, isDefault: true }
  ]
};
