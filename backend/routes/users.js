const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// All routes here are admin-only (enforced in server.js)

router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json(users.map(u => u.toSafe()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const user = await User.create({
      name, email,
      role: role === 'admin' ? 'admin' : 'staff',
      passwordHash: await bcrypt.hash(password, 12),
    });
    res.status(201).json(user.toSafe());
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already in use' });
    res.status(400).json({ error: err.message });
  }
});

// Guard: never leave the system without an active admin
async function wouldRemoveLastAdmin(target, next) {
  const losingAdmin = target.role === 'admin' && target.active &&
    ((next.role && next.role !== 'admin') || next.active === false);
  if (!losingAdmin) return false;
  const others = await User.countDocuments({ _id: { $ne: target._id }, role: 'admin', active: true });
  return others === 0;
}

router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, role, active, password } = req.body;
    if (String(user._id) === String(req.user._id) && (role === 'staff' || active === false)) {
      return res.status(400).json({ error: 'You cannot demote or disable your own account' });
    }
    if (await wouldRemoveLastAdmin(user, { role, active })) {
      return res.status(400).json({ error: 'At least one active admin is required' });
    }

    if (name !== undefined) user.name = name;
    if (role === 'admin' || role === 'staff') user.role = role;
    if (typeof active === 'boolean') user.active = active;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      user.passwordHash = await bcrypt.hash(password, 12);
    }
    await user.save();
    res.json(user.toSafe());
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    if (await wouldRemoveLastAdmin(user, { active: false })) {
      return res.status(400).json({ error: 'At least one active admin is required' });
    }
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
