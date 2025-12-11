// indexer/index.js
console.log("Starting combined indexer and API...");
require("dotenv").config();
const path = require("path");

const expressApp = require("./server"); // server exports express app start
const indexer = require("./indexer"); // indexer tries to connect to node or enters simulate mode

// Start server already handled in server.js; indexer module will start itself
