const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nationality: { type: String, required: true },
    rank: { type: Number },
    hand: { type: String, enum: ['R', 'L', 'U'], default: 'R' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Player', playerSchema);
