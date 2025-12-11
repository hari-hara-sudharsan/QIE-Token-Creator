// // indexer/server.js
// const express = require("express");
// const fs = require("fs");
// const cors = require("cors");
// require("dotenv").config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// // FIXED: absolute path to DB inside indexer folder (Railway safe)
// const DB = __dirname + "/db.json";

// const ADMIN_KEY = process.env.INDEXER_ADMIN_KEY || "";

// /* ---------------------------------------------------------
//    Helpers
// --------------------------------------------------------- */
// function readDB() {
//   if (!fs.existsSync(DB)) {
//     fs.writeFileSync(
//       DB,
//       JSON.stringify({ tokens: [] }, null, 2)
//     );
//   }
//   return JSON.parse(fs.readFileSync(DB, "utf8"));
// }

// function writeDB(data) {
//   fs.writeFileSync(DB, JSON.stringify(data, null, 2));
// }

// /* ---------------------------------------------------------
//    GET — All Tokens
// --------------------------------------------------------- */
// app.get("/tokens", (req, res) => {
//   const db = readDB();
//   res.json(db.tokens);
// });

// /* ---------------------------------------------------------
//    GET — Single Token by Address
// --------------------------------------------------------- */
// app.get("/tokens/:address", (req, res) => {
//   const db = readDB();
//   const addr = req.params.address.toLowerCase();

//   const token = db.tokens.find(
//     (t) => (t.tokenAddress || "").toLowerCase() === addr
//   );

//   if (!token)
//     return res.status(404).json({ error: "Token not found" });

//   res.json(token);
// });

// /* ---------------------------------------------------------
//    POST — Add New Token (frontend → backend)
// --------------------------------------------------------- */
// app.post("/tokens", (req, res) => {
//   const incoming = req.body;

//   if (!incoming.tokenAddress)
//     return res.status(400).json({ error: "Missing tokenAddress" });

//   const db = readDB();

//   const exists = db.tokens.find(
//     (t) =>
//       (t.tokenAddress || "").toLowerCase() ===
//       incoming.tokenAddress.toLowerCase()
//   );

//   if (!exists) {
//     db.tokens.push({
//       tokenAddress: incoming.tokenAddress,
//       owner: incoming.owner,
//       totalSupply: incoming.totalSupply,
//       liquidityQIE: incoming.liquidityQIE,
//       lockMonths: incoming.lockMonths,
//       unlockTime: incoming.unlockTime,
//       trustScore: incoming.trustScore,
//       withdrawn: false,
//       imageCid: incoming.imageCid || "",
//       timestamp: Math.floor(Date.now() / 1000)
//     });
//     writeDB(db);
//   }

//   res.json({ ok: true });
// });

// /* ---------------------------------------------------------
//    POST — Update Withdrawn Status (contract → backend)
// --------------------------------------------------------- */
// app.post("/tokens/:address/withdraw", (req, res) => {
//   const key = req.headers["x-admin-key"] || "";
//   if (ADMIN_KEY && key !== ADMIN_KEY)
//     return res.status(403).json({ error: "Invalid admin key" });

//   const addr = req.params.address.toLowerCase();
//   const db = readDB();

//   const idx = db.tokens.findIndex(
//     (t) => (t.tokenAddress || "").toLowerCase() === addr
//   );

//   if (idx === -1)
//     return res.status(404).json({ error: "Token not found" });

//   db.tokens[idx].withdrawn = true;
//   db.tokens[idx].withdrawnAt = Math.floor(Date.now() / 1000);

//   writeDB(db);
//   res.json({ ok: true });
// });

// /* ---------------------------------------------------------
//    START SERVER
// --------------------------------------------------------- */
// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () =>
//   console.log(`Indexer API running on port ${PORT}`)
// );

// indexer/server.js
// indexer/server.js
// server.js
// server.js — REST API
// indexer/server.js
const express = require("express");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const DB = path.join(__dirname, "db.json");
const ADMIN_KEY = process.env.INDEXER_ADMIN_KEY || "";

// Ensure DB file exists
function ensureDB() {
  if (!fs.existsSync(DB)) {
    fs.writeFileSync(DB, JSON.stringify({ tokens: [] }, null, 2));
  }
}

// Safely read JSON, handling empty or corrupted files
function readDB() {
  ensureDB();
  try {
    const raw = fs.readFileSync(DB, "utf8");
    if (!raw.trim()) {
      // Empty file -> reinit
      fs.writeFileSync(DB, JSON.stringify({ tokens: [] }, null, 2));
      return { tokens: [] };
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn("DB JSON parse error, reinitializing:", e);
    fs.writeFileSync(DB, JSON.stringify({ tokens: [] }, null, 2));
    return { tokens: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// List all tokens
app.get("/tokens", (req, res) => {
  const db = readDB();
  res.json(db.tokens || []);
});

// Get token by address
app.get("/tokens/:address", (req, res) => {
  const addr = (req.params.address || "").toLowerCase();
  const db = readDB();
  const token = (db.tokens || []).find(
    (t) => (t.tokenAddress || "").toLowerCase() === addr
  );
  if (!token) return res.status(404).json({ error: "Not found" });
  res.json(token);
});

/**
 * Simulation endpoint: simulates a blockchain launch.
 * frontend calls /sim-launch to add token to db and returns tokenAddress
 */
app.post("/sim-launch", (req, res) => {
  const incoming = req.body || {};
  const db = readDB();

  const now = Math.floor(Date.now() / 1000);

  // generate fake address stable-ish
  const tokenAddress = "0xSIM" + Math.random().toString(16).slice(2, 10);

  const token = {
    owner: incoming.owner || "0xSIMOWNER",
    tokenAddress,
    name: incoming.name || "SimToken",
    symbol: incoming.symbol || "SIM",
    totalSupply: String(incoming.totalSupply || 1000000),
    liquidityQIE: incoming.liquidityQIE || 0.1,
    lockMonths: incoming.lockMonths || 6,
    unlockTime:
      Number(incoming.unlockTime) ||
      now + (incoming.lockMonths || 6) * 30 * 86400,
    trustScore: 3,
    imageCid: incoming.imageCid || "",
    realAsset: !!incoming.realAsset,
    createdAt: now,
    // extra demo fields if you still want them
    timestamp: now,
    priceHistory: [5, 10, 8, 12, 9, 14],
    price: 6.5,
  };

  db.tokens = db.tokens || [];
  db.tokens.unshift(token);
  writeDB(db);

  console.log("Simulated new launch:", tokenAddress);
  res.json({ ok: true, tokenAddress, token });
});

/* optional admin action: mark withdraw */
app.post("/tokens/:address/withdraw", (req, res) => {
  const key = req.headers["x-admin-key"] || "";
  if (ADMIN_KEY && key !== ADMIN_KEY)
    return res.status(403).json({ error: "invalid admin key" });

  const addr = (req.params.address || "").toLowerCase();
  const db = readDB();
  const idx = (db.tokens || []).findIndex(
    (t) => (t.tokenAddress || "").toLowerCase() === addr
  );
  if (idx === -1) return res.status(404).json({ error: "not found" });

  db.tokens[idx].withdrawn = true;
  db.tokens[idx].withdrawnAt = Math.floor(Date.now() / 1000);
  writeDB(db);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Indexer running on port", PORT));

module.exports = app;
