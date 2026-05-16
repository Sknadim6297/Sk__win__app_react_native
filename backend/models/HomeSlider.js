const mongoose = require('mongoose');

const homeSliderSchema = new mongoose.Schema(
  {
    image: { type: String, required: true, trim: true },
    link: { type: String, default: '', trim: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HomeSlider', homeSliderSchema);
