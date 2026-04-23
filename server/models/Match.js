const mongoose = require('mongoose');

const setSchema = new mongoose.Schema(
  {
    setNum: { type: Number, required: true },
    winnerScore: { type: Number, required: true },
    loserScore: { type: Number, required: true },
    tiebreak: { type: Boolean, default: false },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    tourney_name: { type: String, required: true },
    surface: { type: String, required: true },
    winner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    loser_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    sets: [setSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Match', matchSchema);
