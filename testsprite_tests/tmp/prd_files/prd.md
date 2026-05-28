# AgroHarvest Platform - Product Requirements Document

## Overview
AgroHarvest is a multi-role agricultural marketplace platform connecting farmers, dealers, and delivery agents. Built with vanilla HTML/JS frontend and Node.js/Express backend with PostgreSQL.

## User Roles
- **Farmer**: Lists products, manages orders/contracts, tracks earnings
- **Dealer (Agro)**: Manages agricultural input inventory, tracks deliveries
- **Agent**: Manages and updates delivery statuses
- **Customer**: Browses marketplace, places orders

## Core Features

### Authentication
- Signup: POST /api/signup with name, email, password, role, district
- Signin: POST /api/signin with email, password → returns user + role
- Role-based redirect after login to correct dashboard

### Farmer Dashboard (/dashboard)
- View stats: total products, orders, earnings
- Add product: name, yield (kg), price, category, harvest date, image
- View/delete products via GET/DELETE /api/products
- View incoming orders and accept them via /api/orders/:id/accept
- View and accept contracts via /api/contracts/accept

### Dealer Dashboard (/dealer_dashboard.html)
- Manage inventory (add, view, delete products)
- Track delivery statuses

### Agent Dashboard (/agent_dashboard.html)
- View all orders
- Update order delivery status (Processing → Shipped → Delivered)

### Marketplace (/marketplace.html)
- View all available products
- Filter by category
- Add to cart, proceed to checkout

### Checkout (/checkout.html)
- Fill delivery address
- Place order via POST /api/orders

### Orders (/orders.html)
- View/filter all orders
- Update or delete orders

### Earnings (/earnings.html, /dealer_earnings.html)
- View total revenue, pending amounts, delivered order count

### Live Market Trends (/market_trends.html)
- Fetches live prices from Kalimati market via GET /api/market-data
- Displays commodity grid with min/max/avg prices

### Settings (/settings.html, /dealer_settings.html)
- Profile update
- Theme toggle (dark/light)

## API Endpoints
- POST /api/signup
- POST /api/signin
- GET/POST /api/products
- DELETE /api/products/:id
- GET /api/orders
- GET /api/orders/farmer/:farmerName
- POST /api/orders
- POST /api/orders/:id/status
- POST /api/orders/:id/accept
- DELETE /api/orders/:id
- GET /api/earnings/:farmerName
- GET/POST /api/contracts
- POST /api/contracts/accept
- POST /api/contracts/cancel/:id
- GET /api/market-data

## Known Limitations
- Auth uses sessionStorage (no JWT)
- Market data depends on external Kalimati API
- Product images stored as base64 in DB
