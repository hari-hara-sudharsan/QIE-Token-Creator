// indexer/server.js
const express = require("express");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const DB = "./db.json";
const ADMIN_KEY = process.env.INDEXER_ADMIN_KEY || "";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
function readDB() {
  if (!fs.existsSync(DB)) {
    fs.writeFileSync(
      DB,
      JSON.stringify({ tokens: [] }, null, 2)
    );
  }
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

/* ---------------------------------------------------------
   GET — All Tokens
--------------------------------------------------------- */
app.get("/tokens", (req, res) => {
  const db = readDB();
  res.json(db.tokens);
});

/* ---------------------------------------------------------
   GET — Single Token by Address
--------------------------------------------------------- */
app.get("/tokens/:address", (req, res) => {
  const db = readDB();
  const addr = req.params.address.toLowerCase();

  const token = db.tokens.find(
    (t) => (t.tokenAddress || "").toLowerCase() === addr
  );

  if (!token) return res.status(404).json({ error: "Token not found" });

  res.json(token);
});

/* ---------------------------------------------------------
   POST — Add New Token (called from frontend after launch)
--------------------------------------------------------- */
app.post("/tokens", (req, res) => {
  const incoming = req.body;

  if (!incoming.tokenAddress)
    return res.status(400).json({ error: "Missing tokenAddress" });

  const db = readDB();

  // Avoid duplicates
  const exists = db.tokens.find(
    (t) =>
      (t.tokenAddress || "").toLowerCase() ===
      incoming.tokenAddress.toLowerCase()
  );
  if (!exists) {
    db.tokens.push({
      tokenAddress: incoming.tokenAddress,
      owner: incoming.owner,
      totalSupply: incoming.totalSupply,
      liquidityQIE: incoming.liquidityQIE,
      lockMonths: incoming.lockMonths,
      unlockTime: incoming.unlockTime,
      trustScore: incoming.trustScore,
      withdrawn: false,
      imageCid: incoming.imageCid || "",
      timestamp: Math.floor(Date.now() / 1000)
    });
    writeDB(db);
  }

  res.json({ ok: true });
});

/* ---------------------------------------------------------
   POST — Update Withdrawn Status
--------------------------------------------------------- */
app.post("/tokens/:address/withdraw", (req, res) => {
  const key = req.headers["x-admin-key"] || "";
  if (ADMIN_KEY && key !== ADMIN_KEY) {
    return res.status(403).json({ error: "Invalid admin key" });
  }

  const addr = req.params.address.toLowerCase();
  const db = readDB();

  const idx = db.tokens.findIndex(
    (t) => (t.tokenAddress || "").toLowerCase() === addr
  );

  if (idx === -1)
    return res.status(404).json({ error: "Token not found" });

  db.tokens[idx].withdrawn = true;
  db.tokens[idx].withdrawnAt = Math.floor(Date.now() / 1000);

  writeDB(db);
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   SERVER START
--------------------------------------------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Indexer running on port ${PORT}`)
);
