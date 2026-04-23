const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Match = require('../models/Match');

// -------------------------------------------------------
// GET /api/matches/head-to-head?player1=ID&player2=ID
// Uses: Aggregation with $match, $or, $lookup, $unwind, $project
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

    const matches = await Match.aggregate([
      {
        $match: {
          $or: [
            { winner_id: p1, loser_id: p2 },
            { winner_id: p2, loser_id: p1 },
          ],
        },
      },
      // $lookup — join with Players for winner
      {
        $lookup: {
          from: 'players',
          localField: 'winner_id',
          foreignField: '_id',
          as: 'winner',
        },
      },
      { $unwind: '$winner' },
      // $lookup — join with Players for loser
      {
        $lookup: {
          from: 'players',
          localField: 'loser_id',
          foreignField: '_id',
          as: 'loser',
        },
      },
      { $unwind: '$loser' },
      // $project — shape the output
      {
        $project: {
          tourney_name: 1,
          surface: 1,
          sets: 1,
          'winner.name': 1,
          'winner.nationality': 1,
          'winner._id': 1,
          'loser.name': 1,
          'loser.nationality': 1,
          'loser._id': 1,
        },
      },
    ]);

    const p1Wins = matches.filter(
      (m) => m.winner._id.toString() === player1
    ).length;
    const p2Wins = matches.filter(
      (m) => m.winner._id.toString() === player2
    ).length;

    res.json({
      totalMatches: matches.length,
      player1Wins: p1Wins,
      player2Wins: p2Wins,
      matches,
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
    const matches = await Match.find({
      sets: {
        $elemMatch: { winnerScore: 6, loserScore: 0 },
      },
    })
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

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
    const matches = await Match.find({
      sets: {
        $elemMatch: { tiebreak: true },
      },
    })
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

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
    const stats = await Match.aggregate([
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
    ]);
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

    const stats = await Match.aggregate([
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
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/top-winners
// Uses: Aggregation with $group, $sort, $limit, $lookup
// Players with most wins
// -------------------------------------------------------
router.get('/top-winners', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const surface = req.query.surface; // optional filter

    const pipeline = [];

    // Optional surface filter with $match
    if (surface) {
      pipeline.push({ $match: { surface: surface } });
    }

    pipeline.push(
      // $group — count wins per player
      {
        $group: {
          _id: '$winner_id',
          wins: { $sum: 1 },
          tournaments: { $addToSet: '$tourney_name' },
        },
      },
      { $sort: { wins: -1 } },
      { $limit: limit },
      // $lookup — get player details
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'player',
        },
      },
      { $unwind: '$player' },
      // $addFields — enrich output
      {
        $addFields: {
          tournamentCount: { $size: '$tournaments' },
        },
      },
      {
        $project: {
          _id: 0,
          playerId: '$_id',
          name: '$player.name',
          nationality: '$player.nationality',
          rank: '$player.rank',
          wins: 1,
          tournamentCount: 1,
        },
      }
    );

    const result = await Match.aggregate(pipeline);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/overview
// Uses: $facet — run multiple aggregation pipelines in one query
// Returns surface, tournament, and total stats all at once
// -------------------------------------------------------
router.get('/overview', async (req, res) => {
  try {
    const result = await Match.aggregate([
      {
        $facet: {
          // Pipeline 1: Total count
          totalMatches: [{ $count: 'count' }],
          // Pipeline 2: By surface
          bySurface: [
            { $group: { _id: '$surface', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          // Pipeline 3: Top 10 tournaments
          topTournaments: [
            { $group: { _id: '$tourney_name', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          // Pipeline 4: Matches with 3+ sets (long matches)
          longMatches: [
            { $addFields: { setCount: { $size: '$sets' } } },
            { $match: { setCount: { $gte: 3 } } },
            { $count: 'count' },
          ],
          // Pipeline 5: Matches with tiebreakers
          tiebreakerMatches: [
            {
              $match: {
                sets: { $elemMatch: { tiebreak: true } },
              },
            },
            { $count: 'count' },
          ],
          // Pipeline 6: 6-0 sweeps count
          sweepMatches: [
            {
              $match: {
                sets: { $elemMatch: { winnerScore: 6, loserScore: 0 } },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const data = result[0];
    res.json({
      totalMatches: data.totalMatches[0]?.count || 0,
      bySurface: data.bySurface,
      topTournaments: data.topTournaments,
      longMatches: data.longMatches[0]?.count || 0,
      tiebreakerMatches: data.tiebreakerMatches[0]?.count || 0,
      sweepMatches: data.sweepMatches[0]?.count || 0,
    });
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

    const matches = await Match.find({ surface })
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(limit)
      .lean();

    const count = await Match.countDocuments({ surface });
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
    const matches = await Match.find({
      tourney_name: { $regex: req.params.name, $options: 'i' },
    })
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(50)
      .lean();

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
    const matches = await Match.find({
      $expr: { $eq: [{ $size: '$sets' }, 2] },
    })
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

    const total = await Match.countDocuments({
      $expr: { $eq: [{ $size: '$sets' }, 2] },
    });

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
    const matches = await Match.find({
      sets: {
        $elemMatch: { winnerScore: 7, loserScore: 5 },
      },
    })
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

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
    const matches = await Match.find({
      $expr: { $eq: [{ $size: '$sets' }, 3] },
    })
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

    const total = await Match.countDocuments({
      $expr: { $eq: [{ $size: '$sets' }, 3] },
    });

    res.json({ totalCount: total, showing: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/dominant-wins
// Uses: $all + $elemMatch — matches where EVERY set was won 6-0 or 6-1
// (Double bagel / double breadstick)
// -------------------------------------------------------
router.get('/dominant-wins', async (req, res) => {
  try {
    // Find matches where all sets had loserScore <= 1
    // Using $not + $elemMatch to exclude any set where loser scored > 1
    const matches = await Match.find({
      'sets.0': { $exists: true },
      sets: {
        $not: {
          $elemMatch: { loserScore: { $gt: 1 } },
        },
      },
    })
      .populate('winner_id', 'name nationality')
      .populate('loser_id', 'name nationality')
      .limit(100)
      .lean();

    res.json({ count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/filter?surface=Hard&tournament=Wimbledon
// Uses: Simple $and query — combine multiple field filters
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
    res.json({ totalCount: total, showing: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// GET /api/matches/top-rivalries
// Uses: Advanced aggregation with $addFields, $cond, $toString,
//       $concat, $group, $sort, $limit, $lookup, $unwind,
//       $project — finds which player pairs played most matches
// -------------------------------------------------------
router.get('/top-rivalries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 15;

    const rivalries = await Match.aggregate([
      // Step 1: Create a canonical pair ID so (A vs B) and (B vs A) group together
      // Uses $cond to always put the "smaller" ObjectId first
      {
        $addFields: {
          pairKey: {
            $concat: [
              {
                $cond: {
                  if: { $lt: ['$winner_id', '$loser_id'] },
                  then: { $toString: '$winner_id' },
                  else: { $toString: '$loser_id' },
                },
              },
              '_',
              {
                $cond: {
                  if: { $lt: ['$winner_id', '$loser_id'] },
                  then: { $toString: '$loser_id' },
                  else: { $toString: '$winner_id' },
                },
              },
            ],
          },
          // Also track which is playerA (smaller) and playerB (larger)
          playerA: {
            $cond: {
              if: { $lt: ['$winner_id', '$loser_id'] },
              then: '$winner_id',
              else: '$loser_id',
            },
          },
          playerB: {
            $cond: {
              if: { $lt: ['$winner_id', '$loser_id'] },
              then: '$loser_id',
              else: '$winner_id',
            },
          },
        },
      },
      // Step 2: Group by pair key — count matches, track who won each
      {
        $group: {
          _id: '$pairKey',
          playerA: { $first: '$playerA' },
          playerB: { $first: '$playerB' },
          totalMatches: { $sum: 1 },
          // Collect all winner_ids to compute win breakdown
          winners: { $push: '$winner_id' },
          surfaces: { $addToSet: '$surface' },
          tournaments: { $addToSet: '$tourney_name' },
        },
      },
      // Step 3: Sort by total matches descending
      { $sort: { totalMatches: -1 } },
      { $limit: limit },
      // Step 4: Lookup playerA details
      {
        $lookup: {
          from: 'players',
          localField: 'playerA',
          foreignField: '_id',
          as: 'playerAInfo',
        },
      },
      { $unwind: '$playerAInfo' },
      // Step 5: Lookup playerB details
      {
        $lookup: {
          from: 'players',
          localField: 'playerB',
          foreignField: '_id',
          as: 'playerBInfo',
        },
      },
      { $unwind: '$playerBInfo' },
      // Step 6: Compute win counts using $reduce + $cond
      {
        $addFields: {
          playerAWins: {
            $size: {
              $filter: {
                input: '$winners',
                cond: { $eq: ['$$this', '$playerA'] },
              },
            },
          },
          playerBWins: {
            $size: {
              $filter: {
                input: '$winners',
                cond: { $eq: ['$$this', '$playerB'] },
              },
            },
          },
        },
      },
      // Step 7: Clean projection
      {
        $project: {
          _id: 0,
          totalMatches: 1,
          surfaces: 1,
          tournamentCount: { $size: '$tournaments' },
          playerA: {
            _id: '$playerA',
            name: '$playerAInfo.name',
            nationality: '$playerAInfo.nationality',
            rank: '$playerAInfo.rank',
            wins: '$playerAWins',
          },
          playerB: {
            _id: '$playerB',
            name: '$playerBInfo.name',
            nationality: '$playerBInfo.nationality',
            rank: '$playerBInfo.rank',
            wins: '$playerBWins',
          },
        },
      },
    ]);

    res.json(rivalries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
