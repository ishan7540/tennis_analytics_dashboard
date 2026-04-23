const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const Player = require('./models/Player');
const Match = require('./models/Match');

// ---------------------------------------------------------------------------
// Helper: parse a standard tennis score string into the sets array format
// Examples: "6-4 6-2", "7-6(5) 3-6 6-4", "6-3 6-7(4) 7-6(3)", "W/O"
// ---------------------------------------------------------------------------
function parseScore(scoreStr) {
  if (!scoreStr || scoreStr.trim() === '' || scoreStr.trim() === 'W/O') {
    return [];
  }

  const sets = [];
  // Split on whitespace to get individual set strings
  const parts = scoreStr.trim().split(/\s+/);

  let setNum = 1;
  for (const part of parts) {
    // Skip retirement markers
    if (part === 'RET' || part === 'DEF' || part === 'Def.' || part === 'ABN') {
      continue;
    }

    // Match patterns like "6-4" or "7-6(5)"
    const match = part.match(/^(\d+)-(\d+)(?:\((\d+)\))?$/);
    if (match) {
      const winnerScore = parseInt(match[1], 10);
      const loserScore = parseInt(match[2], 10);
      const tiebreak = match[3] !== undefined;

      sets.push({
        setNum,
        winnerScore,
        loserScore,
        tiebreak,
      });
      setNum++;
    }
    // else: skip any token we can't parse (e.g., "Played" or unusual notations)
  }

  return sets;
}

// ---------------------------------------------------------------------------
// Main seeding logic
// ---------------------------------------------------------------------------
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Player.deleteMany({});
    await Match.deleteMany({});
    console.log('🗑️  Cleared existing players and matches');

    const csvPath = path.join(__dirname, 'data', 'seed_data.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found at ${csvPath}`);
      console.error('   Copy seed_data.csv into server/data/ first.');
      process.exit(1);
    }

    // Read all rows into memory first (CSV stream → array)
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📄 Read ${rows.length} rows from CSV`);

    // Process in batches
    const BATCH_SIZE = 500;
    let matchesInserted = 0;
    let playersUpserted = 0;
    const playerCache = {}; // name → ObjectId (avoid repeated DB lookups)

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const matchDocs = [];

      for (const row of batch) {
        const winnerName = row.winner_name?.trim();
        const loserName = row.loser_name?.trim();
        if (!winnerName || !loserName) continue;

        // --- Upsert winner ---
        if (!playerCache[winnerName]) {
          const winnerDoc = await Player.findOneAndUpdate(
            { name: winnerName },
            {
              name: winnerName,
              nationality: row.winner_ioc || 'UNK',
              rank: row.winner_rank ? parseInt(row.winner_rank, 10) : null,
              hand: row.winner_hand || 'R',
            },
            { upsert: true, new: true }
          );
          playerCache[winnerName] = winnerDoc._id;
          playersUpserted++;
        }

        // --- Upsert loser ---
        if (!playerCache[loserName]) {
          const loserDoc = await Player.findOneAndUpdate(
            { name: loserName },
            {
              name: loserName,
              nationality: row.loser_ioc || 'UNK',
              rank: row.loser_rank ? parseInt(row.loser_rank, 10) : null,
              hand: row.loser_hand || 'R',
            },
            { upsert: true, new: true }
          );
          playerCache[loserName] = loserDoc._id;
          playersUpserted++;
        }

        // --- Parse score ---
        const sets = parseScore(row.score);

        // --- Build match doc ---
        matchDocs.push({
          tourney_name: row.tourney_name || 'Unknown',
          surface: row.surface || 'Hard',
          winner_id: playerCache[winnerName],
          loser_id: playerCache[loserName],
          sets,
        });
      }

      // Bulk insert matches for this batch
      if (matchDocs.length > 0) {
        await Match.insertMany(matchDocs);
        matchesInserted += matchDocs.length;
      }

      process.stdout.write(
        `\r⏳ Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} rows processed`
      );
    }

    console.log(
      `\n\n🎾 Seeding complete!`
    );
    console.log(`   Players upserted : ${Object.keys(playerCache).length}`);
    console.log(`   Matches inserted : ${matchesInserted}`);
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

seed();
