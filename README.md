# 🗳️ Blockchain-Based Secure Voting System

A complete full-stack voting application built with Node.js, Express, MongoDB, and blockchain integration. This system ensures secure, transparent, and tamper-proof voting through blockchain technology.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Security Features](#security-features)
- [Usage Guide](#usage-guide)
- [Testing with Demo Credentials](#testing-with-demo-credentials)
- [Troubleshooting](#troubleshooting)
- [Project Roadmap](#project-roadmap)

## ✨ Features

### User Authentication
- **Aadhaar Validation**: 12-digit Aadhaar number validation
- **PAN Validation**: Standard PAN format validation (ABCDE1234F)
- **Secure Hashing**: SHA-256 hashing of Aadhaar + PAN creates unique voter ID
- **Password Security**: Bcrypt hashing for password storage
- **No Raw Data Storage**: Aadhaar and PAN are never stored in plain text

### OTP Verification
- **Simple OTP System**: 6-digit OTP generation and verification
- **Time-based Expiry**: OTP expires after 5 minutes
- **Resend Capability**: Users can request a new OTP
- **Demo Mode**: OTP is logged to console for development/testing

### Voting System
- **Single Vote Per User**: Prevents double voting with `hasVoted` flag
- **Candidate List**: Display list of candidates before voting
- **Vote Recording**: Stores vote with voterHash and candidate name
- **Vote Confirmation**: Asks for confirmation before submitting vote
- **Already Voted Notice**: Clear message if user has already voted

### Blockchain Implementation
- **Immutable Records**: Each vote is a block in the chain
- **Cryptographic Hashing**: SHA-256 hashing for each block
- **Chain Validation**: System verifies chain integrity on every query
- **Block Structure**:
  - `index`: Block position in chain
  - `voterHash`: Hashed voter ID (for privacy)
  - `candidateSelected`: Candidate name
  - `timestamp`: Vote timestamp
  - `previousHash`: Hash of previous block (ensures integrity)
  - `currentHash`: Hash of current block

### Security Features
- **JWT Authentication**: Secure session management with JWT tokens
- **Hashing**: SHA-256 and bcrypt hashing for sensitive data
- **Input Validation**: Backend validation for all inputs
- **CORS**: Enabled for secure cross-origin requests
- **Rate Limiting**: Can be added for production
- **Audit Trail**: IP address and user agent logging for votes

### Results & Transparency
- **Live Results**: Real-time vote counting
- **Percentage Display**: Shows vote percentage for each candidate
- **Blockchain Transparency**: Display blockchain status and recent votes
- **Public Results**: Anyone can view voting results without logging in

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Hashing**: bcryptjs, crypto (SHA-256)
- **Validation**: express-validator
- **CORS**: cors middleware

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with gradients and animations
- **JavaScript**: Vanilla JS (no frameworks for simplicity)
- **API Client**: Fetch API for backend communication
- **Responsive Design**: Mobile-friendly layout

### Blockchain
- **Custom Implementation**: Simple yet secure blockchain class
- **Hashing**: SHA-256 using Node.js crypto module
- **Data Structure**: Array-based chain with block validation

## 📁 Project Structure

```
votingsys/
├── backend/
│   ├── blockchain/
│   │   └── VotingBlockchain.js        # Blockchain implementation
│   ├── controllers/
│   │   ├── authController.js          # Authentication logic
│   │   └── votingController.js        # Voting logic
│   ├── middleware/
│   │   └── auth.js                    # JWT verification middleware
│   ├── models/
│   │   ├── User.js                    # User schema
│   │   └── Vote.js                    # Vote record schema
│   ├── routes/
│   │   ├── authRoutes.js              # Auth endpoints
│   │   └── votingRoutes.js            # Voting endpoints
│   ├── server.js                      # Main server file
│   ├── package.json                   # Dependencies
│   └── .env                           # Environment variables
│
└── frontend/
    ├── index.html                     # Login/Register page
    ├── otp.html                       # OTP verification page
    ├── voting.html                    # Voting dashboard
    ├── results.html                   # Results display page
    ├── css/
    │   └── styles.css                 # Global stylesheet
    └── js/
        ├── api.js                     # API client helper
        ├── auth.js                    # Auth UI handler
        └── voting.js                  # Voting UI handler
```

## 🔐 Prerequisites

Before installation, ensure you have:

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/

2. **MongoDB** (Local or Cloud)
   - Local: https://www.mongodb.com/try/download/community
   - Cloud: MongoDB Atlas (free tier available)

3. **Text Editor/IDE**
   - VS Code, WebStorm, Sublime Text, etc.

4. **Postman** (Optional, for API testing)
   - Download from: https://www.postman.com/

## 📦 Installation & Setup

### Step 1: Install Node.js Dependencies

Navigate to the backend folder and install all dependencies:

```bash
cd d:\votingsys\backend
npm install
```

This will install:
- express
- mongoose
- bcryptjs
- jsonwebtoken
- cors
- dotenv

### Step 2: Configure Environment Variables

Update the `.env` file with your settings:

```bash
# .env file
MONGODB_URI=mongodb://localhost:27017/voting-system
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
PORT=5000
NODE_ENV=development
OTP_SECRET=otp_secret_key_12345
OTP_EXPIRY=300
SESSION_SECRET=your_session_secret_key
```

**For Production**, use MongoDB Atlas:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voting-system
JWT_SECRET=generate_a_strong_random_string_here
```

## 🗄️ Database Setup

### Option 1: Local MongoDB

1. **Install MongoDB Community Edition**:
   - Windows: Download installer from mongodb.com
   - Mac: `brew tap mongodb/brew && brew install mongodb-community`
   - Linux: Follow official MongoDB installation guide

2. **Start MongoDB Service**:
   ```bash
   # Windows
   mongod.exe

   # Mac/Linux
   brew services start mongodb-community
   # or
   mongod
   ```

3. **Verify MongoDB is Running**:
   ```bash
   mongo # or mongosh for newer versions
   ```

### Option 2: MongoDB Atlas (Cloud)

1. **Create Free Account**: https://www.mongodb.com/cloud/atlas
2. **Create a Cluster** (Choose free tier)
3. **Get Connection String**: 
   - From Dashboard → Connect → Connect Your Application
   - Copy the connection string
4. **Update `.env`**:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voting-system?retryWrites=true&w=majority
   ```

### Option 3: Docker (Optional)

If you have Docker installed:

```bash
docker run -d -p 27017:27017 --name voting-mongodb mongo
```

## ▶️ Running the Application

### Start the Backend Server

```bash
cd d:\votingsys\backend

# Install dependencies (if not done)
npm install

# Start server (development mode)
npm start

# Or with auto-reload (if nodemon is available)
npm run dev
```

Expected output:
```
========================================
  Voting System Server Started
========================================
  URL: http://localhost:5000
  Environment: development
  MongoDB: mongodb://localhost:27017/voting-system
========================================
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:5000
```

You should see the login/registration page.

## 📡 API Documentation

### Authentication Endpoints

#### 1. Register a New User
```
POST /api/auth/register

Request Body:
{
  "aadhaar": "123456789012",
  "pan": "ABCDE1234F",
  "username": "john_doe",
  "password": "securepass123",
  "confirmPassword": "securepass123"
}

Response:
{
  "success": true,
  "message": "User registered successfully. OTP has been sent.",
  "token": "eyJhbGc...",
  "userId": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "otp": "123456"  // For demo only
}
```

#### 2. Login
```
POST /api/auth/login

Request Body:
{
  "aadhaar": "123456789012",
  "pan": "ABCDE1234F",
  "username": "john_doe",
  "password": "securepass123"
}

Response:
{
  "success": true,
  "message": "Login successful. OTP sent.",
  "token": "eyJhbGc...",
  "userId": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "otp": "123456"  // For demo only
}
```

#### 3. Verify OTP
```
POST /api/auth/verify-otp

Request Body:
{
  "userId": "507f1f77bcf86cd799439011",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "OTP verified successfully. You can now vote.",
  "token": "eyJhbGc..."  // Token with OTP verified flag
}
```

#### 4. Resend OTP
```
POST /api/auth/resend-otp

Request Body:
{
  "userId": "507f1f77bcf86cd799439011"
}

Response:
{
  "success": true,
  "message": "New OTP sent successfully.",
  "otp": "654321"  // For demo only
}
```

### Voting Endpoints

#### 5. Get Candidates
```
GET /api/voting/candidates

Headers:
Authorization: Bearer YOUR_TOKEN

Response:
{
  "success": true,
  "message": "Candidates retrieved successfully.",
  "candidates": [
    {
      "id": 1,
      "name": "Candidate A",
      "party": "Party Alpha",
      "symbol": "🎯"
    },
    ...
  ]
}
```

#### 6. Cast Vote
```
POST /api/voting/vote

Headers:
Authorization: Bearer YOUR_TOKEN

Request Body:
{
  "candidateSelected": "Candidate A"
}

Response:
{
  "success": true,
  "message": "Vote cast successfully and recorded on blockchain.",
  "blockHash": "a1b2c3d4e5f6...",
  "blockIndex": 5,
  "candidateSelected": "Candidate A"
}
```

#### 7. Get Results
```
GET /api/voting/results

Response:
{
  "success": true,
  "message": "Voting results retrieved successfully.",
  "totalVotes": 45,
  "results": [
    {
      "candidateName": "Candidate A",
      "voteCount": 15,
      "percentage": "33.33%"
    },
    ...
  ],
  "blockchainValid": true
}
```

#### 8. Get Voting Status
```
GET /api/voting/voting-status

Headers:
Authorization: Bearer YOUR_TOKEN

Response:
{
  "success": true,
  "hasVoted": true,
  "votedFor": "Candidate A",
  "username": "john_doe"
}
```

#### 9. Get Blockchain Info
```
GET /api/voting/blockchain-info

Response:
{
  "success": true,
  "message": "Blockchain information retrieved successfully.",
  "totalBlocks": 46,
  "totalVotes": 45,
  "chainValid": true,
  "lastBlock": { ... },
  "votes": [ ... ]
}
```

## 🔒 Security Features

### Data Protection
- **Aadhaar & PAN**: Never stored in plain text
  - Combined as `Aadhaar + PAN`
  - Hashed with SHA-256 to create voter ID
  - Only hash is stored in database

- **Password Hashing**: Bcrypt with salt rounds = 10
  - Raw password never logged or stored
  - Verified during login using bcryptjs.compare()

- **JWT Tokens**: 
  - Includes userId, voterIdHash, and OTP verification status
  - Expires after 24 hours
  - Verified on protected endpoints

### Input Validation
- Aadhaar: Must be exactly 12 digits
- PAN: Must match standard format (ABCDE1234F)
- Username: Minimum 3 characters, must be unique
- Password: Minimum 6 characters

### Blockchain Security
- Each block contains hash of previous block
- Tampering with any vote invalidates the chain
- System verifies chain integrity on every query
- Immutable record of all votes

### Database Security
- Unique indexes on voterIdHash and username
- Passwords hashed before storage
- Audit trail with IP addresses
- OTP stored temporarily with expiry

## 👥 Usage Guide

### For First-Time Users

1. **Register**:
   - Go to http://localhost:5000
   - Click "Register" tab
   - Enter your Aadhaar (12 digits), PAN, username, and password
   - Check the terms and conditions
   - Click "Register"

2. **Verify OTP**:
   - You'll be redirected to OTP verification page
   - Check the console for the demo OTP (in development)
   - Or receive it via SMS in production
   - Enter the 6-digit OTP
   - Click "Verify OTP"

3. **Vote**:
   - Select a candidate by clicking their card
   - Click "Cast Vote" button
   - Confirm your choice in the popup
   - Your vote is recorded on the blockchain

4. **View Results**:
   - After voting, view live results
   - See blockchain status and recent votes
   - All data updates in real-time

### For Existing Users

1. **Login**:
   - Go to http://localhost:5000
   - Enter your Aadhaar, PAN, username, and password
   - Click "Login"

2. **Verify OTP**:
   - Same as above

3. **Check Voting Status**:
   - If you've already voted, you'll see your candidate
   - You cannot change or revote

### View Public Results

- Visit http://localhost:5000/results.html
- No login required
- See live voting statistics
- View blockchain verification status

## 🧪 Testing with Demo Credentials

Use these demo credentials for testing:

### Demo User 1
```
Aadhaar: 123456789012
PAN: ABCDE1234F
Username: voter1
Password: password123
```

### Demo User 2
```
Aadhaar: 987654321098
PAN: XYZAB5678C
Username: voter2
Password: password123
```

### Demo OTP
The system logs the OTP to the console in development mode:
```
OTP for user voter1: 123456
```

Copy this OTP and enter it on the OTP verification page.

## 🐛 Troubleshooting

### Issue: "Cannot GET /"
**Solution**: Make sure MongoDB is running and the server started correctly.

### Issue: "MongoDB connection error"
**Solution**:
1. Check if MongoDB is running: `mongod` or `brew services start mongodb-community`
2. Verify connection string in `.env`
3. For Atlas, check if IP is whitelisted

### Issue: "CORS error"
**Solution**: Ensure frontend is accessing API at correct URL (http://localhost:5000)

### Issue: "Token expired"
**Solution**: Register/login again. Tokens expire after 24 hours.

### Issue: "OTP not received"
**Solution**: 
- In development, check the console logs
- Resend OTP using the "Resend OTP" button
- Wait 5 minutes for OTP expiry

### Issue: "Cannot vote - already voted"
**Solution**: Each Aadhaar+PAN combination can vote only once. This is by design.

### Issue: Backend starts but pages don't load
**Solution**: 
1. Check if PORT 5000 is not already in use: `netstat -ano` (Windows) or `lsof -i :5000` (Mac/Linux)
2. Try a different port in `.env` file
3. Restart the server

## 📈 Project Roadmap

### Completed ✅
- User authentication with Aadhaar/PAN
- OTP verification system
- Blockchain implementation
- Single vote per user
- JWT authentication
- MongoDB integration
- Responsive frontend
- Live results display
- Public results page

### Planned for Future 📋
- Email/SMS OTP delivery (using Twilio)
- Real-time notifications (using Socket.io)
- Admin dashboard for vote management
- Advanced analytics and charts
- Voter list import from CSV
- Two-factor authentication (2FA)
- Rate limiting and DDoS protection
- Biometric authentication (fingerprint/face)
- Audit log with timestamps and IP tracking
- Docker containerization
- Kubernetes deployment
- CI/CD pipeline setup
- Unit and integration tests
- Load testing and optimization

## 📝 Notes

1. **Demo Mode**: This is a demonstration. OTP is logged to console for testing.
2. **Production**: In production:
   - Use real SMS/Email service for OTP
   - Store JWT_SECRET in environment/vault
   - Enable HTTPS
   - Add rate limiting
   - Enable comprehensive logging
   - Set up automated backups

3. **Data Privacy**: 
   - System complies with data protection principles
   - Raw Aadhaar/PAN never stored
   - Only hashes used for identification

4. **Scalability**:
   - Current blockchain is in-memory
   - For production, persist blockchain to database
   - Implement sharding for large-scale deployments

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review console logs for error messages
3. Check MongoDB connection
4. Verify environment variables in `.env`

## 📄 License

This project is open source and available under the MIT License.

---

**Happy Voting! 🗳️**
