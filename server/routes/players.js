const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');

// -------------------------------------------------------
// GET /api/players — Return all players
// Supports: ?sort=rank|name|nationality  &order=asc|desc
//           &hand=R|L  &nationality=ESP
//           &limit=N   &skip=N
// Uses: .find(), .sort(), .limit(), .skip(), .countDocuments()
// -------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { sort = 'rank', order = 'asc', hand, nationality, limit, skip, rankedOnly } = req.query;

    // Build filter object — simple MongoDB query operators
    const filter = {};
    if (hand) filter.hand = hand;
    if (nationality) filter.nationality = nationality.toUpperCase();
    // $ne operator — exclude unranked players when rankedOnly=true
    if (rankedOnly === 'true') filter.rank = { $ne: null };

    // Count total matching docs — uses countDocuments()
    const totalCount = await Player.countDocuments(filter);

    // Use aggregation pipeline ($addFields, $cond) to handle null ranks
    // so they sort to the bottom instead of the top
    const sortDir = order === 'desc' ? -1 : 1;

    const pipeline = [
      { $match: filter },
      // $addFields + $cond: assign a high sort value for nulls
      {
        $addFields: {
          _sortRank: {
            $cond: {
              if: { $eq: ['$rank', null] },
              then: 99999,
              else: '$rank',
            },
          },
        },
      },
    ];

    // Build sort stage
    if (sort === 'rank') {
      pipeline.push({ $sort: { _sortRank: sortDir } });
    } else {
      const sortObj = {};
      sortObj[sort] = sortDir;
      pipeline.push({ $sort: sortObj });
    }

    // Remove the temp sort field
    pipeline.push({ $project: { _sortRank: 0 } });

    if (skip) pipeline.push({ $skip: parseInt(skip, 10) });
    if (limit) pipeline.push({ $limit: parseInt(limit, 10) });

    const players = await Player.aggregate(pipeline);
    res.json({ players, totalCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/search?q=term
// Uses: $regex operator for pattern matching (case-insensitive)
// -------------------------------------------------------
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    // $regex with $options: 'i' for case-insensitive search
    const players = await Player.find({
      name: { $regex: q, $options: 'i' },
    })
      .sort({ rank: 1 })
      .limit(20);

    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/nationalities
// Uses: .distinct() — returns unique nationality codes
// -------------------------------------------------------
router.get('/nationalities', async (req, res) => {
  try {
    const nationalities = await Player.distinct('nationality');
    res.json(nationalities.sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/count
// Uses: .countDocuments() — simple count query
// -------------------------------------------------------
router.get('/count', async (req, res) => {
  try {
    const count = await Player.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/by-nationality
// Uses: Aggregation with $group + $push + $sort + $project
// Groups all players by country with count
// -------------------------------------------------------
router.get('/by-nationality', async (req, res) => {
  try {
    const result = await Player.aggregate([
      {
        $group: {
          _id: '$nationality',
          count: { $sum: 1 },
          players: { $push: { name: '$name', rank: '$rank' } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 30 },
      {
        $project: {
          nationality: '$_id',
          count: 1,
          topPlayers: { $slice: ['$players', 5] },
          _id: 0,
        },
      },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// POST /api/players — Add a new player (Basic CRUD)
// Uses: .create()
// -------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { name, nationality, rank, hand } = req.body;
    if (!name || !nationality) {
      return res.status(400).json({ error: 'Name and nationality are required' });
    }
    const player = await Player.create({ name, nationality, rank, hand });
    res.status(201).json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/:id — Get single player by ID
// Uses: .findById()
// -------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// PUT /api/players/:id — Update a player
// Uses: .findByIdAndUpdate()
// -------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// DELETE /api/players/:id — Delete a player
// Uses: .findByIdAndDelete()
// -------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json({ message: 'Player deleted', player });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/:id/stats — Surface win-percentage
// Uses: Aggregation with $match, $group, $or
// -------------------------------------------------------
router.get('/:id/stats', async (req, res) => {
  try {
    const playerId = new mongoose.Types.ObjectId(req.params.id);

    // 1) Count wins per surface
    const wins = await Match.aggregate([
      { $match: { winner_id: playerId } },
      { $group: { _id: '$surface', wins: { $sum: 1 } } },
    ]);

    // 2) Count total matches (win OR loss) per surface — uses $or
    const totals = await Match.aggregate([
      {
        $match: {
          $or: [{ winner_id: playerId }, { loser_id: playerId }],
        },
      },
      { $group: { _id: '$surface', total: { $sum: 1 } } },
    ]);

    // 3) Merge into a single result
    const totalMap = {};
    totals.forEach((t) => (totalMap[t._id] = t.total));

    const stats = wins.map((w) => ({
      surface: w._id,
      wins: w.wins,
      total: totalMap[w._id] || w.wins,
      winPercentage: Math.round(
        (w.wins / (totalMap[w._id] || w.wins)) * 100
      ),
    }));

    // Include surfaces where the player only lost
    totals.forEach((t) => {
      if (!stats.find((s) => s.surface === t._id)) {
        stats.push({
          surface: t._id,
          wins: 0,
          total: t.total,
          winPercentage: 0,
        });
      }
    });

    const player = await Player.findById(req.params.id);
    res.json({ player, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/:id/matches — All matches for a player
// Uses: $or query, .populate(), .sort(), .limit()
// -------------------------------------------------------
router.get('/:id/matches', async (req, res) => {
  try {
    const playerId = new mongoose.Types.ObjectId(req.params.id);
    const limit = parseInt(req.query.limit, 10) || 50;

    // Uses $or to find matches where player is winner OR loser
    const matches = await Match.find({
      $or: [{ winner_id: playerId }, { loser_id: playerId }],
    })
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
