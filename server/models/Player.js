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

// ============================================================
//  INDEXES
// ============================================================

// --- Simple Indexes ---

// 1. Single-field index on 'rank' (ascending)
//    Used by: GET /api/players (default sort), rank-range ($gte/$lte)
playerSchema.index({ rank: 1 });

// 2. Single-field index on 'nationality'
//    Used by: GET /api/players?nationality=ESP, by-nationality aggregation
playerSchema.index({ nationality: 1 });

// 3. Single-field index on 'hand'
//    Used by: GET /api/players/left-handed, hand-stats aggregation, filter
playerSchema.index({ hand: 1 });

// 4. Text index on 'name' for efficient text search
//    Used by: GET /api/players/search?q=Thiem ($regex queries)
playerSchema.index({ name: 'text' });

// --- Compound Indexes ---

// 5. Compound index on { nationality, rank }
//    Used by: GET /api/players?nationality=ESP&sort=rank
//    Covers filter-by-country + sort-by-rank in a single index scan
playerSchema.index({ nationality: 1, rank: 1 });

// 6. Compound index on { hand, nationality }
//    Used by: GET /api/players?hand=L&nationality=FRA
//    Covers combined filter queries from the Dashboard
playerSchema.index({ hand: 1, nationality: 1 });

module.exports = mongoose.model('Player', playerSchema);
