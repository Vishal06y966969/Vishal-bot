const login = require("fca-unofficial"); // Ya jo fca library aap use karte hain
const fs = require("fs");
const path = require("path");
const handleCommands = require("./handleCommands");

// Cache directory check
if (!fs.existsSync("./cache")) {
  fs.mkdirSync("./cache");
}

// Global state variables
global.dpLockLink = global.dpLockLink || {};
global.groupNameLock = global.groupNameLock || {};
global.nicknameLockStatus = global.nicknameLockStatus || {};
global.lockedNicknames = global.lockedNicknames || {};

const activeTargets1 = new Set();
const activeTargets2 = new Set();

// ==========================================
// CONFIGURATION
// ==========================================
const OWNER_ID = "61595178507849"; // Aapki FB UID
const ID_NUM = 1; // Single ID ke liye 1 rakhein

function startBot() {
  const appstatePath = path.join(__dirname, "appstate.json");

  if (!fs.existsSync(appstatePath)) {
    console.error("❌ Error: 'appstate.json' file nahi mili! Pehle appstate import karein.");
    return;
  }

  let appState;
  try {
    appState = JSON.parse(fs.readFileSync(appstatePath, "utf8"));
  } catch (err) {
    console.error("❌ Error: 'appstate.json' invalid/corrupt hai!");
    return;
  }

  const loginOptions = {
    appState: appState,
    listenEvents: true,
    selfListen: false,
    logLevel: "silent",
    forceLogin: true,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  login(loginOptions, (err, api) => {
    if (err) {
      console.error("❌ Login Failed! Appstate cookie expire ho gayi hai:", err);
      return;
    }

    console.log(`✅ Bot Successfully Active for ID ${ID_NUM}!`);

    api.listenMqtt(async (err, event) => {
      if (err) return console.error("MQTT Error:", err);

      if (event.type === "message" || event.type === "message_reply") {
        const messageText = event.body ? event.body.trim() : "";
        const args = messageText.split(" ");
        const cmd = args.shift().toLowerCase();
        const input = args.join(" ");

        try {
          await handleCommands({
            api,
            event,
            args,
            cmd,
            idNum: ID_NUM,
            OWNER_ID,
            lockedNicknames: global.lockedNicknames,
            activeTargets1,
            activeTargets2,
            input
          });
        } catch (cmdErr) {
          console.error("Command Execution Error:", cmdErr);
        }
      }
    });
  });
}

startBot();
