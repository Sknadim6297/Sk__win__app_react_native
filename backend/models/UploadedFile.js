const mongoose = require('mongoose');

const uploadedFileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, unique: true, index: true },
    mimetype: { type: String, required: true },
    data: { type: Buffer, required: true },
    size: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UploadedFile', uploadedFileSchema);
