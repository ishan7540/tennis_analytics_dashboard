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

// ============================================================
//  INDEXES
// ============================================================

// --- Simple Indexes ---

// 1. Single-field index on 'winner_id'
//    Used by: GET /api/players/:id/stats (aggregation $match on winner_id),
//             GET /api/matches/top-winners ($group by winner_id),
//             GET /api/matches/top-rivalries
matchSchema.index({ winner_id: 1 });

// 2. Single-field index on 'loser_id'
//    Used by: GET /api/players/:id/stats ($match on loser_id),
//             GET /api/players/:id/matches ($or query)
matchSchema.index({ loser_id: 1 });

// 3. Single-field index on 'surface'
//    Used by: GET /api/matches/surface-stats ($group by surface),
//             GET /api/matches/by-surface/:surface,
//             GET /api/matches/top-winners?surface=Hard ($match filter)
matchSchema.index({ surface: 1 });

// 4. Single-field index on 'tourney_name'
//    Used by: GET /api/matches/tournament-stats ($group by tourney_name),
//             GET /api/matches/by-tournament/:name ($regex search)
matchSchema.index({ tourney_name: 1 });

// 5. Multikey index on 'sets.tiebreak' (indexes into embedded array)
//    Used by: GET /api/matches/tiebreakers ($elemMatch { tiebreak: true }),
//             GET /api/matches/overview ($facet → tiebreakerMatches pipeline)
matchSchema.index({ 'sets.tiebreak': 1 });

// 6. Multikey index on 'sets.loserScore' (indexes into embedded array)
//    Used by: GET /api/matches/sweeps ($elemMatch { loserScore: 0 }),
//             GET /api/matches/dominant-wins ($not + $elemMatch { loserScore: $gt: 1 }),
//             GET /api/matches/close-sets ($elemMatch { loserScore: 5 })
matchSchema.index({ 'sets.loserScore': 1 });

// --- Compound Indexes ---

// 7. Compound index on { winner_id, loser_id }
//    Used by: GET /api/matches/head-to-head ($match with $or on both fields),
//             GET /api/matches/top-rivalries (pair grouping)
//    This is the most important compound index — it covers H2H lookups
matchSchema.index({ winner_id: 1, loser_id: 1 });

// 8. Compound index on { surface, tourney_name }
//    Used by: GET /api/matches/filter?surface=Hard&tournament=Wimbledon
//             (combined field match + $regex)
matchSchema.index({ surface: 1, tourney_name: 1 });

// 9. Compound multikey index on { sets.winnerScore, sets.loserScore }
//    Used by: GET /api/matches/sweeps ($elemMatch { winnerScore: 6, loserScore: 0 }),
//             GET /api/matches/close-sets ($elemMatch { winnerScore: 7, loserScore: 5 })
//    Optimizes $elemMatch queries on set scores
matchSchema.index({ 'sets.winnerScore': 1, 'sets.loserScore': 1 });

module.exports = mongoose.model('Match', matchSchema);
