// // indexer/indexer.js
// const { ethers } = require("ethers");
// const fs = require("fs");
// require("dotenv").config();

// // Option C — Demo Mode (NO RPC NEEDED)

// const fs = require("fs");
// console.log("Indexer running in DEMO mode (no blockchain RPC).");

// // Ensure DB exists
// if (!fs.existsSync("db.json")) {
//   fs.writeFileSync("db.json", JSON.stringify({ tokens: [] }, null, 2));
// }

// // Nothing else to do — backend will serve all tokens from REST API


// const LAUNCHPAD_ABI = require("./LaunchPadABI.json");
// const RPC = process.env.QIE_RPC;
// const LAUNCHPAD_ADDRESS = process.env.LAUNCHPAD_ADDRESS;
// const START_BLOCK = Number(process.env.LAUNCHPAD_START_BLOCK || 0);
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// const provider = new ethers.JsonRpcProvider(process.env.QIE_RPC, {
//   timeout: 20000
// });


// console.log("Starting Indexer…");
// console.log("ENV CHECK:", { RPC, LAUNCHPAD_ADDRESS, START_BLOCK });

// if (!fs.existsSync("db.json")) fs.writeFileSync("db.json", JSON.stringify({ tokens: [] }, null, 2));

// async function main() {
//   console.log("Listening from block:", START_BLOCK);

//   const contract = new ethers.Contract(LAUNCHPAD_ADDRESS, LAUNCHPAD_ABI, provider);

//   const latest = await provider.getBlockNumber();
//   let from = START_BLOCK;

//   while (from <= latest) {
//     const to = Math.min(from + 5000, latest);
//     console.log(`Fetching logs: ${from} → ${to}`);
//     try {
//       const logs = await provider.getLogs({
//         address: LAUNCHPAD_ADDRESS,
//         fromBlock: from,
//         toBlock: to,
//         topics: [ethers.id("Launched(address,address,uint256,uint256,uint256,uint256)")]
//       });

//       for (const log of logs) {
//         const parsed = contract.interface.parseLog(log);
//         saveLaunch(parsed.args, log.transactionHash);
//       }
//     } catch (err) {
//       console.warn("getLogs error:", err?.message || err);
//     }
//     from = to + 1;
//   }

//   contract.on("Launched", (owner, token, supply, liquidity, months, unlockTime, event) => {
//     console.log("New Launch:", token);
//     saveLaunch({ owner, token, totalSupply: supply, liquidityQIE: liquidity, lockMonths: months, unlockTime }, event.transactionHash);
//   });

//   console.log("Indexer realtime listener attached.");
// }

// function saveLaunch(data, txHash) {
//   const db = JSON.parse(fs.readFileSync("db.json"));
//   const exists = db.tokens.find((x) => (x.tokenAddress || "").toLowerCase() === (data.token || "").toLowerCase());
//   if (exists) return;
//   db.tokens.push({
//     owner: data.owner,
//     tokenAddress: data.token,
//     name: data.name || "",
//     totalSupply: data.totalSupply?.toString?.() || String(data.totalSupply),
//     liquidityQIE: data.liquidityQIE?.toString?.() || String(data.liquidityQIE || "0"),
//     lockMonths: Number(data.lockMonths || 0),
//     unlockTime: Number(data.unlockTime || 0),
//     creationTx: txHash,
//     trustScore: 2,
//     withdrawn: false,
//     imageCid: ""
//   });
//   fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
//   console.log("Saved token:", data.token);
// }

// main().catch((e) => {
//   console.error("Indexer Error:", e);
//   process.exit(1);
// });

// indexer/indexer.js
// DEMO MODE – No RPC, no blockchain logs.

// indexer.js
// indexer.js — demo-only simulated blockchain indexer

// indexer/indexer.js
// indexer/indexer.js
const fs = require("fs");
const { ethers } = require("ethers");
require("dotenv").config();

const DB_FILE = "./db.json";
const DEMO_MODE = process.env.DEMO_MODE === "true";
const RPC = process.env.QIE_RPC || "";
const LAUNCHPAD_ADDRESS = process.env.LAUNCHPAD_ADDRESS || "";
const START_BLOCK = Number(process.env.LAUNCHPAD_START_BLOCK || 0);

// Ensure DB file exists
function ensureDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ tokens: [] }, null, 2));
  }
}

// Safe read: handle empty / corrupted JSON
function readDB() {
  ensureDB();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    if (!raw.trim()) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ tokens: [] }, null, 2));
      return { tokens: [] };
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn("DB JSON parse error in indexer, reinitializing:", e);
    fs.writeFileSync(DB_FILE, JSON.stringify({ tokens: [] }, null, 2));
    return { tokens: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Seed demo tokens (simulation mode)
async function seedDemo() {
  const db = readDB();
  if ((db.tokens || []).length > 0) return;

  const now = Math.floor(Date.now() / 1000);
  const demo = [];

  for (let i = 0; i < 6; i++) {
    const addr = "0xSIM" + Math.random().toString(16).slice(2, 8);
    demo.push({
      owner: `0xSIMOWNER${i}`,
      tokenAddress: addr,
      name: `SIM-${i}`,
      symbol: `S${i}`,
      totalSupply: String(1_000_000),
      liquidityQIE: 10,
      lockMonths: 6,
      unlockTime: now + 6 * 30 * 86400,
      trustScore: 2,
      imageCid: "",
      createdAt: now - i * 86400,
    });
    console.log("Saved token:", addr);
  }

  db.tokens = demo;
  writeDB(db);
  console.log("Seeding demo tokens (simulation mode)...");
}

// Main indexer start
async function startIndexer() {
  ensureDB();

  // DEMO_MODE flag takes precedence
  if (DEMO_MODE) {
    console.log("DEMO_MODE active. Not connecting to RPC.");
    await seedDemo();
    console.log("Indexer running in simulation mode.");
    return;
  }

  // If no RPC configured, also go simulation
  if (!RPC) {
    console.log("No RPC configured — running in simulation mode.");
    await seedDemo();
    return;
  }

  let provider = null;
  try {
    provider = new ethers.JsonRpcProvider(RPC);
    await provider.getNetwork();
    console.log("Connected to RPC — running live indexer.");
    // TODO: implement real log scanning here using LAUNCHPAD_ADDRESS / START_BLOCK
    // For now, you can still seed some demo if db is empty
    await seedDemo();
  } catch (e) {
    console.warn(
      "RPC unreachable, entering simulation/hybrid mode.",
      e.message || e
    );
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    await seedDemo();
  }
}

startIndexer();

module.exports = { readDB, writeDB, seedDemo };
