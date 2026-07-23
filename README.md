
# 🛒 Grocery Management System

A comprehensive, full-stack mobile application designed to streamline the grocery shopping experience for customers and provide powerful administrative tools for store managers. Built with a focus on a seamless user experience, secure transactions, and efficient order management.

## 🚀 Project Overview

This project is a complete Grocery Management System featuring a modern mobile application built with React Native (Expo). It serves two primary user roles:

- **Customers:** Enjoy a smooth shopping experience with features like product browsing, advanced search, cart management, real-time order tracking, and multiple payment options.
- **Admins:** Gain full control over the store's operations, including inventory management, order processing, payment monitoring, and customer support ticket handling.


## ✨ Key Features

### 🛍️ Customer App
- **Product Discovery:** Browse products by category, search by name, and view detailed product information.
- **Shopping Cart:** Add/remove items, adjust quantities, and proceed to checkout.
- **Order Management:** Place new orders, view order history, and track the live status of deliveries.
- **Payments:** Choose from secure payment methods including **Stripe**, **Bank Transfer**, and **Cash on Delivery**.
- **User Profile:** Manage personal information, view order history, and update account settings.
- **Support:** Submit support requests or report issues directly from the app.

### 🔧 Admin Panel
- **Inventory Management:** Add, edit, or delete products; monitor real-time stock levels and receive low-stock alerts.
- **Order Fulfillment:** View and manage all customer orders; update order statuses (e.g., 'Confirmed', 'Shipped', 'Delivered').
- **Financial Management:** Oversee all transactions, manage payment records, and generate invoices.
- **Customer Support:** View, respond to, and resolve customer support tickets.
- **User Management:** View and manage registered customer accounts.


## 🏗️ Tech Stack

### Frontend
- **React Native (Expo)** - For building the cross-platform mobile application.
- **React Navigation** - For screen navigation.
- **Axios** - For making HTTP requests to the backend API.
- **React Native Elements / UI Kitten** - For a clean and consistent UI (replace with your chosen library).

### Backend
- **Node.js** - JavaScript runtime environment.
- **Express.js** - Web framework for building RESTful APIs.
- **MongoDB** - NoSQL database for storing application data.
- **Mongoose** - ODM (Object Data Modeling) library for MongoDB.

### Security & Authentication
- **JSON Web Tokens (JWT)** - For secure user authentication and authorization.
- **Bcrypt** - For hashing user passwords.
- **Nodemailer (Gmail SMTP)** - For sending OTP (One-Time Password) email verification codes.

### Payments & Email
- **Stripe API** - For processing credit/debit card payments.
- **Nodemailer** - For sending transactional emails (order confirmations, password resets, etc.).


## 🧰 Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- [Node.js](https://nodejs.org/) (v14.x or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas account)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- A [Stripe](https://stripe.com/) account for payment testing (for API keys)
- A Gmail account for email services (for Nodemailer)


## ⚙️ Installation & Setup

Follow these steps to get the application running on your local machine.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/grocery-management-system.git
cd grocery-management-system
```

### 2. Backend Setup (`/backend`)

Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` root directory and add the following environment variables:

```env
# Server
PORT=5000

# Database
MONGO_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Email (Nodemailer)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:19006
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup (`/frontend`)

Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` root directory:

```env
API_URL=http://localhost:5000/api
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

Start the Expo development server:
```bash
npm start
# or
expo start
```

Run the app on your preferred platform:
- Press `i` for iOS simulator.
- Press `a` for Android emulator.
- Scan the QR code with the Expo Go app on your physical device.

---

## 📝 API Documentation

While the project is under continuous development, a comprehensive API documentation is provided via Postman. You can access the collection here:

[![Run in Postman](https://run.pstmn.io/button.svg)](https://documenter.getpostman.com/view/your-postman-docs-link) *(Replace with your actual documentation link)*

**Key Endpoints:**
- `/api/auth` - User registration, login, and OTP verification.
- `/api/products` - CRUD operations for products.
- `/api/orders` - Placing, retrieving, and updating orders.
- `/api/payments` - Stripe payment intents and confirmations.

---

## 🤝 Team & Acknowledgements

This project was developed as a team effort at **SLIIT** (Sri Lanka Institute of Information Technology). We are deeply grateful to our lecturers and mentors for their invaluable guidance, support, and expertise throughout this journey.

---

## 🚀 Future Enhancements

- **Push Notifications:** Implement real-time notifications for order updates.
- **Admin Dashboard:** Develop a web-based admin dashboard for better management.
- **Advanced Analytics:** Integrate analytics for sales trends and customer behavior.
- **Chat Support:** Add real-time chat functionality for customer support.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📧 Contact

If you have any questions or suggestions, feel free to reach out:

- **Sakith Nishshanka:** sakithnishshankawork@gmail.com
- **Project Link:** (https://github.com/SakithNishshanka/grocery-management-system)

---

**Thank you for visiting our project! We hope you find it useful. 🚀✨**
