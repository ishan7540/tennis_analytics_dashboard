const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');
const logQuery = require('../utils/queryLogger');

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

    logQuery(
      'GET /api/players',
      'players',
      'aggregate()',
      pipeline,
      players.length
    );

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
    const query = { name: { $regex: q, $options: 'i' } };
    const players = await Player.find(query)
      .sort({ rank: 1 })
      .limit(20);

    logQuery(
      'GET /api/players/search',
      'players',
      'find() + sort() + limit(20)',
      query,
      players.length
    );

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

    logQuery(
      'GET /api/players/nationalities',
      'players',
      'distinct("nationality")',
      { field: 'nationality' },
      nationalities.length
    );

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

    logQuery(
      'GET /api/players/count',
      'players',
      'countDocuments()',
      {},
      count
    );

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
    const pipeline = [
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
    ];

    const result = await Player.aggregate(pipeline);

    logQuery(
      'GET /api/players/by-nationality',
      'players',
      'aggregate()',
      pipeline,
      result.length
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/hand-stats
// Uses: Simple aggregation — $group by hand field + $sort
// -------------------------------------------------------
router.get('/hand-stats', async (req, res) => {
  try {
    const pipeline = [
      { $group: { _id: '$hand', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];

    const stats = await Player.aggregate(pipeline);

    logQuery(
      'GET /api/players/hand-stats',
      'players',
      'aggregate()',
      pipeline,
      stats.length
    );

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/top-countries
// Uses: Simple aggregation — $group by nationality + $sort + $limit
// -------------------------------------------------------
router.get('/top-countries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 15;
    const pipeline = [
      { $group: { _id: '$nationality', playerCount: { $sum: 1 } } },
      { $sort: { playerCount: -1 } },
      { $limit: limit },
    ];

    const stats = await Player.aggregate(pipeline);

    logQuery(
      'GET /api/players/top-countries',
      'players',
      'aggregate()',
      pipeline,
      stats.length
    );

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/left-handed
// Uses: Simple .find() with field value match — { hand: 'L' }
// -------------------------------------------------------
router.get('/left-handed', async (req, res) => {
  try {
    const query = { hand: 'L' };
    const players = await Player.find(query)
      .sort({ rank: 1 })
      .lean();

    logQuery(
      'GET /api/players/left-handed',
      'players',
      'find() + sort({ rank: 1 })',
      query,
      players.length
    );

    res.json({ count: players.length, players });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/players/rank-range?min=50&max=100
// Uses: $gte and $lte range operators
// -------------------------------------------------------
router.get('/rank-range', async (req, res) => {
  try {
    const min = parseInt(req.query.min, 10) || 1;
    const max = parseInt(req.query.max, 10) || 100;
    const query = { rank: { $gte: min, $lte: max } };

    const players = await Player.find(query)
      .sort({ rank: 1 })
      .lean();

    logQuery(
      'GET /api/players/rank-range',
      'players',
      'find() + sort({ rank: 1 })',
      query,
      players.length
    );

    res.json({ count: players.length, players });
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
    const doc = { name, nationality, rank, hand };
    const player = await Player.create(doc);

    logQuery(
      'POST /api/players',
      'players',
      'create()',
      doc,
      1
    );

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
    const query = { _id: req.params.id };
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    logQuery(
      'GET /api/players/:id',
      'players',
      'findById()',
      query,
      player ? 1 : 0
    );

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
    const query = { _id: req.params.id, update: req.body };
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    logQuery(
      'PUT /api/players/:id',
      'players',
      'findByIdAndUpdate()',
      query,
      player ? 1 : 0
    );

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
    const query = { _id: req.params.id };
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    logQuery(
      'DELETE /api/players/:id',
      'players',
      'findByIdAndDelete()',
      query,
      1
    );

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
    const winsPipeline = [
      { $match: { winner_id: playerId } },
      { $group: { _id: '$surface', wins: { $sum: 1 } } },
    ];
    const wins = await Match.aggregate(winsPipeline);

    logQuery(
      'GET /api/players/:id/stats (wins)',
      'matches',
      'aggregate()',
      winsPipeline,
      wins.length
    );

    // 2) Count total matches (win OR loss) per surface — uses $or
    const totalsPipeline = [
      {
        $match: {
          $or: [{ winner_id: playerId }, { loser_id: playerId }],
        },
      },
      { $group: { _id: '$surface', total: { $sum: 1 } } },
    ];
    const totals = await Match.aggregate(totalsPipeline);

    logQuery(
      'GET /api/players/:id/stats (totals)',
      'matches',
      'aggregate()',
      totalsPipeline,
      totals.length
    );

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
    const query = {
      $or: [{ winner_id: playerId }, { loser_id: playerId }],
    };

    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    logQuery(
      'GET /api/players/:id/matches',
      'matches',
      `find() + populate() + sort() + limit(${limit})`,
      query,
      matches.length
    );

    res.json({ count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
