const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const { authenticate, requireAdmin } = require('./middleware/auth');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('❌ JWT_SECRET must be set (at least 16 characters).');
  process.exit(1);
}

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL, // set in Render env vars
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Public routes
app.get('/', (req, res) => res.json({ status: 'Kirana API running ✅' }));
app.use('/api/auth', require('./routes/auth'));

// Protected routes (any logged-in user; write actions are admin-only inside each router)
app.use('/api/products',    authenticate, require('./routes/products'));
app.use('/api/sales',       authenticate, require('./routes/sales'));
app.use('/api/predictions', authenticate, require('./routes/predictions'));

// Admin-only
app.use('/api/users', authenticate, requireAdmin, require('./routes/users'));

// Create the first admin from env vars if no users exist yet
async function ensureAdmin() {
  if (await User.estimatedDocumentCount() > 0) return;
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('⚠️  No users exist. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin.');
    return;
  }
  await User.create({
    name: ADMIN_NAME || 'Admin',
    email: ADMIN_EMAIL,
    role: 'admin',
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
  });
  console.log(`👤 First admin created: ${ADMIN_EMAIL}`);
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected ✅');
    await ensureAdmin();
    app.listen(process.env.PORT, () =>
      console.log(`Server on port ${process.env.PORT} ✅`)
    );
  })
  .catch(err => console.error(err));
