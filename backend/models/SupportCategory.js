const mongoose = require('mongoose');

const supportCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, uppercase: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportCategory', supportCategorySchema);
