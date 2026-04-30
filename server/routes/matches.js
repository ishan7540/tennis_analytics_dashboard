const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Match = require('../models/Match');

// -------------------------------------------------------
// Helper: Pretty-print MongoDB queries in the terminal
// -------------------------------------------------------
function logQuery(routeName, collection, operation, queryOrPipeline, resultCount) {
  const divider = '═'.repeat(60);
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n\x1b[36m${divider}\x1b[0m`);
  console.log(`\x1b[33m📡 [${timestamp}] API CALLED: ${routeName}\x1b[0m`);
  console.log(`\x1b[36m${divider}\x1b[0m`);
  console.log(`\x1b[32m   Collection : \x1b[0m${collection}`);
  console.log(`\x1b[32m   Operation  : \x1b[0m${operation}`);
  console.log(`\x1b[32m   Query      :\x1b[0m`);
  console.log(`\x1b[37m${JSON.stringify(queryOrPipeline, null, 2)}\x1b[0m`);
  if (resultCount !== undefined) {
    console.log(`\x1b[32m   Results    : \x1b[0m\x1b[33m${resultCount} document(s)\x1b[0m`);
  }
  console.log(`\x1b[36m${divider}\x1b[0m\n`);
}

// -------------------------------------------------------
// GET /api/matches/head-to-head?player1=ID&player2=ID
// Uses: $or query with .find() + .populate()
// -------------------------------------------------------
router.get('/head-to-head', async (req, res) => {
  try {
    const { player1, player2 } = req.query;
    if (!player1 || !player2) {
      return res
        .status(400)
        .json({ error: 'Both player1 and player2 query params are required' });
    }

    const p1 = new mongoose.Types.ObjectId(player1);
    const p2 = new mongoose.Types.ObjectId(player2);

    // Uses $or to find matches between the two players
    const query = {
      $or: [
        { winner_id: p1, loser_id: p2 },
        { winner_id: p2, loser_id: p1 },
      ],
    };

    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality _id')
      .populate('loser_id', 'name nationality _id')
      .lean();

    logQuery(
      'GET /api/matches/head-to-head',
      'matches',
      'find() + populate()',
      query,
      matches.length
    );

    const p1Wins = matches.filter(
      (m) => m.winner_id._id.toString() === player1
    ).length;
    const p2Wins = matches.filter(
      (m) => m.winner_id._id.toString() === player2
    ).length;

    res.json({
      totalMatches: matches.length,
      player1Wins: p1Wins,
      player2Wins: p2Wins,
      matches: matches.map((m) => ({
        tourney_name: m.tourney_name,
        surface: m.surface,
        sets: m.sets,
        winner: { _id: m.winner_id._id, name: m.winner_id.name, nationality: m.winner_id.nationality },
        loser: { _id: m.loser_id._id, name: m.loser_id.name, nationality: m.loser_id.nationality },
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/sweeps
// Uses: $elemMatch to find matches where a set was won 6-0
// -------------------------------------------------------
router.get('/sweeps', async (req, res) => {
  try {
    const query = {
      sets: {
        $elemMatch: { winnerScore: 6, loserScore: 0 },
      },
    };

    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

    logQuery(
      'GET /api/matches/sweeps',
      'matches',
      'find() + populate() + limit(100)',
      query,
      matches.length
    );

    res.json({ count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/tiebreakers
// Uses: $elemMatch with tiebreak: true
// -------------------------------------------------------
router.get('/tiebreakers', async (req, res) => {
  try {
    const query = {
      sets: {
        $elemMatch: { tiebreak: true },
      },
    };

    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

    logQuery(
      'GET /api/matches/tiebreakers',
      'matches',
      'find() + populate() + limit(100)',
      query,
      matches.length
    );

    res.json({ count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/count
// Uses: .countDocuments() — simple count
// -------------------------------------------------------
router.get('/count', async (req, res) => {
  try {
    const count = await Match.countDocuments();

    logQuery(
      'GET /api/matches/count',
      'matches',
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
// GET /api/matches/surface-stats
// Uses: Aggregation with $group + $sort — match count per surface
// -------------------------------------------------------
router.get('/surface-stats', async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$surface',
          matchCount: { $sum: 1 },
        },
      },
      { $sort: { matchCount: -1 } },
      {
        $project: {
          surface: '$_id',
          matchCount: 1,
          _id: 0,
        },
      },
    ];

    const stats = await Match.aggregate(pipeline);

    logQuery(
      'GET /api/matches/surface-stats',
      'matches',
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
// GET /api/matches/tournament-stats
// Uses: Aggregation with $group, $sort, $limit
// Top tournaments by number of matches
// -------------------------------------------------------
router.get('/tournament-stats', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;

    const pipeline = [
      {
        $group: {
          _id: '$tourney_name',
          matchCount: { $sum: 1 },
          surfaces: { $addToSet: '$surface' },
        },
      },
      { $sort: { matchCount: -1 } },
      { $limit: limit },
      {
        $project: {
          tournament: '$_id',
          matchCount: 1,
          surfaces: 1,
          _id: 0,
        },
      },
    ];

    const stats = await Match.aggregate(pipeline);

    logQuery(
      'GET /api/matches/tournament-stats',
      'matches',
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
// GET /api/matches/by-surface/:surface
// Uses: .find() with specific field query + .populate()
// -------------------------------------------------------
router.get('/by-surface/:surface', async (req, res) => {
  try {
    const { surface } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    const query = { surface };
    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(limit)
      .lean();

    const count = await Match.countDocuments(query);

    logQuery(
      'GET /api/matches/by-surface/:surface',
      'matches',
      `find() + populate() + limit(${limit})`,
      query,
      matches.length
    );

    res.json({ surface, totalCount: count, showing: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/by-tournament/:name
// Uses: $regex for flexible tournament name matching
// -------------------------------------------------------
router.get('/by-tournament/:name', async (req, res) => {
  try {
    const query = {
      tourney_name: { $regex: req.params.name, $options: 'i' },
    };

    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(50)
      .lean();

    logQuery(
      'GET /api/matches/by-tournament/:name',
      'matches',
      'find() + populate() + limit(50)',
      query,
      matches.length
    );

    res.json({ count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/straights
// Uses: $expr + $size — find straight-set wins (exactly 2 sets)
// -------------------------------------------------------
router.get('/straights', async (req, res) => {
  try {
    const query = {
      $expr: { $eq: [{ $size: '$sets' }, 2] },
    };

    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

    const total = await Match.countDocuments(query);

    logQuery(
      'GET /api/matches/straights',
      'matches',
      'find() + populate() + limit(100)',
      query,
      matches.length
    );

    res.json({ totalCount: total, showing: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/close-sets
// Uses: $elemMatch — sets that went 7-5 (close but no tiebreak)
// -------------------------------------------------------
router.get('/close-sets', async (req, res) => {
  try {
    const query = {
      sets: {
        $elemMatch: { winnerScore: 7, loserScore: 5 },
      },
    };

    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

    logQuery(
      'GET /api/matches/close-sets',
      'matches',
      'find() + populate() + limit(100)',
      query,
      matches.length
    );

    res.json({ count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/three-setters
// Uses: $expr + $size — matches that went to a deciding 3rd set
// -------------------------------------------------------
router.get('/three-setters', async (req, res) => {
  try {
    const query = {
      $expr: { $eq: [{ $size: '$sets' }, 3] },
    };

    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

    const total = await Match.countDocuments(query);

    logQuery(
      'GET /api/matches/three-setters',
      'matches',
      'find() + populate() + limit(100)',
      query,
      matches.length
    );

    res.json({ totalCount: total, showing: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/dominant-wins
// Uses: $not + $elemMatch — matches where EVERY set was won 6-0 or 6-1
// -------------------------------------------------------
router.get('/dominant-wins', async (req, res) => {
  try {
    const query = {
      'sets.0': { $exists: true },
      sets: {
        $not: {
          $elemMatch: { loserScore: { $gt: 1 } },
        },
      },
    };

    const matches = await Match.find(query)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

    logQuery(
      'GET /api/matches/dominant-wins',
      'matches',
      'find() + populate() + limit(100)',
      query,
      matches.length
    );

    res.json({ count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/filter?surface=Hard&tournament=Wimbledon
// Uses: Simple query — combine multiple field filters
// -------------------------------------------------------
router.get('/filter', async (req, res) => {
  try {
    const { surface, tournament } = req.query;
    const filter = {};
    if (surface) filter.surface = surface;
    if (tournament) filter.tourney_name = { $regex: tournament, $options: 'i' };

    const matches = await Match.find(filter)
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(50)
      .lean();

    const total = await Match.countDocuments(filter);

    logQuery(
      'GET /api/matches/filter',
      'matches',
      'find() + populate() + limit(50)',
      filter,
      matches.length
    );

    res.json({ totalCount: total, showing: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
