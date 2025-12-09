import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

import { LAUNCHPAD_ABI } from "../frontend/src/services/launchAbi.js";

const RPC = process.env.QIE_RPC;
const LAUNCHPAD_ADDRESS = process.env.LAUNCHPAD_ADDRESS;
const START_BLOCK = Number(process.env.LAUNCHPAD_START_BLOCK);

const provider = new ethers.JsonRpcProvider(RPC);

console.log("Indexer connecting…");

// Ensure DB exists
if (!fs.existsSync("db.json")) {
  fs.writeFileSync("db.json", JSON.stringify({ tokens: [] }, null, 2));
}

async function main() {
  console.log("Listening from block:", START_BLOCK);

  const contract = new ethers.Contract(
    LAUNCHPAD_ADDRESS,
    LAUNCHPAD_ABI,
    provider
  );

  // -------------------------------------------
  // FETCH PAST EVENTS (in safe batches of 5000)
  // -------------------------------------------
  let latest = await provider.getBlockNumber();
  let from = START_BLOCK;

  while (from < latest) {
    let to = Math.min(from + 5000, latest);

    console.log(`Fetching logs: ${from} → ${to}`);

    const logs = await provider.getLogs({
      address: LAUNCHPAD_ADDRESS,
      topics: [ethers.id("Launched(address,address,uint256,uint256,uint256,uint256)")],
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      const parsed = contract.interface.parseLog(log);
      saveLaunch(parsed.args, log.transactionHash);
    }

    from = to + 1;
  }

  // -------------------------------------------
  // REALTIME LISTENER
  // -------------------------------------------
  contract.on(
    "Launched",
    (owner, token, supply, liquidity, months, unlock, event) => {
      console.log("New Launch:", token);
      saveLaunch(
        { owner, token, totalSupply: supply, liquidityQIE: liquidity, lockMonths: months, unlockTime: unlock },
        event.transactionHash
      );
    }
  );
}

function saveLaunch(data, txHash) {
  const db = JSON.parse(fs.readFileSync("db.json"));
  const exists = db.tokens.find(
    (x) => x.tokenAddress.toLowerCase() === data.token.toLowerCase()
  );
  if (exists) return;

  db.tokens.push({
    owner: data.owner,
    tokenAddress: data.token,
    totalSupply: data.totalSupply.toString(),
    liquidityQIE: data.liquidityQIE.toString(),
    lockMonths: data.lockMonths,
    unlockTime: Number(data.unlockTime),
    creationTx: txHash,
    trustScore: 2,
  });

  fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
  console.log("Saved token:", data.token);
}

main().catch(console.error);
