# E-Commerce Test Platform

A basic e-commerce website built with Node.js/Express for testing payment gateway integrations.

**Payment integration is NOT included** - this is a sandbox for testing automated integration tools.

## Quick Start

```bash
npm install
npm run dev
```

Visit **http://localhost:3000**

## Features

- Product catalog (6 products)
- Shopping cart (add/update/remove)
- Checkout form with customer details
- Order creation

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get single product |
| GET | `/api/cart` | Get current cart |
| POST | `/api/cart/add` | Add item to cart |
| PUT | `/api/cart/update` | Update cart item |
| DELETE | `/api/cart/remove/:id` | Remove item |
| POST | `/api/orders/create` | Create order |
| GET | `/api/orders/:id` | Get order |
| PATCH | `/api/orders/:id` | Update order |

## Files Structure

```
├── server.js              # Express server
├── package.json           # Dependencies
├── data/
│   └── products.js        # Product data
├── public/
│   ├── index.html         # Main page
│   ├── css/styles.css     # Styles
│   └── js/app.js          # Frontend JS
└── README.md
```

## Payment Integration Needed

To complete the checkout, integrate Razorpay Standard Checkout:
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

### Files to modify:
- `server.js` - Add payment endpoints
- `public/js/app.js` - Add payment flow
- `public/index.html` - Add Razorpay script
