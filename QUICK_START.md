# ⚡ Quick Start Guide

Get the voting system running in 5 minutes!

## Prerequisites
- Node.js installed
- MongoDB running locally or Atlas account

## Step 1: Install Dependencies
```bash
cd backend
npm install
```

## Step 2: Configure Database
Edit `backend/.env`:
```
MONGODB_URI=mongodb://localhost:27017/voting-system
JWT_SECRET=your_secret_key
PORT=5000
```

## Step 3: Start MongoDB
```bash
# Windows: mongod.exe
# Mac/Linux: mongod
```

## Step 4: Start the Server
```bash
cd backend
npm start
```

Expected output:
```
Voting System Server Started
URL: http://localhost:5000
```

## Step 5: Open in Browser
```
http://localhost:5000
```

## 🧪 Test with Demo Account
```
Aadhaar: 123456789012
PAN: ABCDE1234F
Username: voter1
Password: password123
```

The OTP will be logged in the console.

## 📍 Important Pages
- **Login**: http://localhost:5000/
- **Voting**: http://localhost:5000/voting.html (after OTP verify)
- **Results**: http://localhost:5000/results.html

## 🐛 Troubleshooting

### "Cannot GET /"
Make sure backend is running and MongoDB is connected.

### "Connection refused"
MongoDB is not running. Start it: `mongod`

### Different Port
Edit `backend/.env` and change PORT, then restart server.

---

For detailed documentation, see [README.md](README.md)
