# 🎾 TennisLytics — Tennis Analytics Dashboard

A full-stack **MERN** (MongoDB, Express, React, Node.js) web application for exploring and analyzing professional tennis data. Built as a learning project to demonstrate various MongoDB query patterns — from simple CRUD operations to aggregation pipelines.

---

## 📸 Features

| Page | Description | MongoDB Concepts Used |
|---|---|---|
| **Dashboard** | Browse, search, sort, filter & add players | `find()`, `aggregate()`, `$match`, `$ne`, `$cond`, `countDocuments()`, `create()` |
| **Head-to-Head** | Compare any two players | `find()` with `$or`, `populate()` |
| **Tournaments** | Tournament stats & surface distribution | `$group`, `$sort`, `$limit`, `$addToSet`, `$project` |
| **Match Explorer** | Filter matches by type (sweeps, tiebreakers, 3-setters, etc.) | `$elemMatch`, `$expr`, `$size`, `$not` |
| **Player Insights** | Hand distribution, country stats, rank range finder | `$group`, `$gte/$lte`, `distinct()`, `find()` |
| **Sweeps** | Matches with 6-0 sets | `$elemMatch` |
| **Player Detail** | Individual player stats with win % by surface | `$match`, `$group`, `$or`, `populate()` |

### 🖥️ Terminal Query Logging

Every MongoDB query is **logged in the server terminal** with full details (collection, operation, query, result count) whenever a feature is used from the frontend. This makes it easy to see exactly what query MongoDB runs in real-time.

---

## 🗂️ Project Structure

```
tennis_analytics_dashboard/
├── client/                   # React frontend (Vite)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   └── SearchableSelect.jsx
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── HeadToHead.jsx
│   │   │   ├── MatchExplorer.jsx
│   │   │   ├── PlayerDetail.jsx
│   │   │   ├── PlayerInsights.jsx
│   │   │   ├── Sweeps.jsx
│   │   │   └── Tournaments.jsx
│   │   ├── api.js            # Axios instance
│   │   ├── App.jsx           # Router setup
│   │   ├── index.css         # Global styles
│   │   └── main.jsx          # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                   # Express backend
│   ├── models/
│   │   ├── Player.js         # Player schema + indexes
│   │   └── Match.js          # Match schema + indexes
│   ├── routes/
│   │   ├── players.js        # Player API routes
│   │   └── matches.js        # Match API routes
│   ├── data/
│   │   └── seed_data.csv     # Tennis match dataset
│   ├── seed.js               # Database seeding script
│   ├── server.js             # Express app entry point
│   ├── .env                  # Environment variables
│   └── package.json
│
├── seed_data.csv             # Raw CSV dataset
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router, Recharts, Axios, Vite |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **Dev Tools** | Nodemon, ESLint |

---

## 🚀 How to Run the Project

### Prerequisites

Make sure you have these installed:

- **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
- **MongoDB** (running locally on port 27017) — [Download](https://www.mongodb.com/try/download/community)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd tennis_analytics_dashboard
```

### Step 2: Install Dependencies

Open **two terminals** (one for server, one for client).

**Terminal 1 — Server:**
```bash
cd server
npm install
```

**Terminal 2 — Client:**
```bash
cd client
npm install
```

### Step 3: Start MongoDB

Make sure MongoDB is running locally. You can start it with:

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Or run mongod directly
mongod --dbpath /path/to/your/data
```

### Step 4: Seed the Database

This loads the tennis match dataset (CSV) into MongoDB. Run this **once** from the server directory:

```bash
cd server
npm run seed
```

This will:
- Read `data/seed_data.csv`
- Create ~1400+ player documents
- Create ~9000+ match documents with parsed set scores

### Step 5: Start the Server

In **Terminal 1** (server):

```bash
cd server
npm run dev
```

The server starts on **http://localhost:5001**. You will see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:5001
```

> **📡 Query logs will appear in this terminal** whenever you use a feature in the frontend!

### Step 6: Start the Client

In **Terminal 2** (client):

```bash
cd client
npm run dev
```

The client starts on **http://localhost:5173**

### Step 7: Open the App

Open your browser and go to:

```
http://localhost:5173
```

---

## 📡 Terminal Query Logging

When you use any feature on the frontend, the **server terminal** (Terminal 1) will display the MongoDB query that was executed:

```
════════════════════════════════════════════════════════════
📡 [2:25:44 PM] API CALLED: GET /api/players/hand-stats
════════════════════════════════════════════════════════════
   Collection : players
   Operation  : aggregate()
   Query      :
[
  { "$group": { "_id": "$hand", "count": { "$sum": 1 } } },
  { "$sort": { "count": -1 } }
]
   Results    : 3 document(s)
════════════════════════════════════════════════════════════
```

Each log shows:
- **Timestamp** — when the query was triggered
- **API Route** — which endpoint was called
- **Collection** — which MongoDB collection was queried
- **Operation** — the Mongoose method used (`find()`, `aggregate()`, `countDocuments()`, etc.)
- **Query** — the full query object or aggregation pipeline
- **Results** — how many documents were returned

---

## 📌 MongoDB Concepts Demonstrated

### Basic Operations
- `find()` — query documents with filters
- `findById()` — get a single document by ID
- `findByIdAndUpdate()` — update a document
- `findByIdAndDelete()` — delete a document
- `create()` — insert a new document
- `countDocuments()` — count matching documents
- `distinct()` — get unique field values

### Query Operators
- `$regex` — pattern matching (search)
- `$gte` / `$lte` — range queries (rank filter)
- `$ne` — not equal (exclude nulls)
- `$or` — logical OR (match winner or loser)
- `$elemMatch` — match within embedded arrays (set scores)
- `$expr` + `$size` — computed expressions (count sets)
- `$not` — negation (dominant wins)
- `$exists` — check field existence

### Aggregation Pipeline
- `$match` — filter documents
- `$group` — group and compute aggregates (`$sum`, `$push`, `$addToSet`)
- `$sort` — sort results
- `$limit` — limit result count
- `$project` — reshape output documents
- `$addFields` + `$cond` — conditional computed fields
- `$slice` — array subset in projection

### Other Features
- `populate()` — Mongoose reference population (joins)
- **Indexes** — single-field, compound, multikey, and text indexes
- **Embedded Documents** — sets array within matches

---

## 📝 API Endpoints

### Players

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/players` | List all players (with sort, filter, pagination) |
| `GET` | `/api/players/search?q=term` | Search players by name |
| `GET` | `/api/players/nationalities` | Get unique nationality codes |
| `GET` | `/api/players/count` | Count total players |
| `GET` | `/api/players/by-nationality` | Group players by country |
| `GET` | `/api/players/hand-stats` | Hand distribution stats |
| `GET` | `/api/players/top-countries` | Top countries by player count |
| `GET` | `/api/players/left-handed` | All left-handed players |
| `GET` | `/api/players/rank-range?min=&max=` | Players in a rank range |
| `POST` | `/api/players` | Add a new player |
| `GET` | `/api/players/:id` | Get player by ID |
| `PUT` | `/api/players/:id` | Update a player |
| `DELETE` | `/api/players/:id` | Delete a player |
| `GET` | `/api/players/:id/stats` | Player win stats by surface |
| `GET` | `/api/players/:id/matches` | Player match history |

### Matches

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/matches/head-to-head?player1=&player2=` | Head-to-head comparison |
| `GET` | `/api/matches/sweeps` | Matches with 6-0 sets |
| `GET` | `/api/matches/tiebreakers` | Matches with tiebreak sets |
| `GET` | `/api/matches/count` | Count total matches |
| `GET` | `/api/matches/surface-stats` | Match count per surface |
| `GET` | `/api/matches/tournament-stats` | Top tournaments by match count |
| `GET` | `/api/matches/by-surface/:surface` | Matches on a specific surface |
| `GET` | `/api/matches/by-tournament/:name` | Matches in a tournament |
| `GET` | `/api/matches/straights` | Straight-set wins (2 sets) |
| `GET` | `/api/matches/close-sets` | Sets that went 7-5 |
| `GET` | `/api/matches/three-setters` | Matches that went to 3 sets |
| `GET` | `/api/matches/dominant-wins` | Every set won 6-0 or 6-1 |
| `GET` | `/api/matches/filter?surface=&tournament=` | Filter matches |



