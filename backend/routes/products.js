const router = require('express').Router();
const Product = require('../models/Product');
const { requireAdmin } = require('../middleware/auth');

// GET all products with stock status
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    const withStatus = products.map(p => ({
      ...p._doc,
      stockStatus: p.currentStock <= p.minThreshold ? 'LOW' : 'SUFFICIENT'
    }));
    res.json(withStatus);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create product
router.post('/', requireAdmin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT update stock
router.put('/:id/stock', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { currentStock: req.body.currentStock },
      { new: true }
    );
    res.json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT update product details (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const allowed = ['name', 'category', 'unit', 'currentStock', 'minThreshold', 'costPrice', 'sellingPrice'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE product (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;