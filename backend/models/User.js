const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role:         { type: String, enum: ['admin', 'staff'], default: 'staff' },
  active:       { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.methods.toSafe = function () {
  return {
    _id: this._id, name: this.name, email: this.email,
    role: this.role, active: this.active, createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
