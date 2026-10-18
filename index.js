const login = require("itz-ur-raza");
const fs = require("fs");
const axios = require("axios");
const express = require("express");
const handleCommands = require("./commands");

const app = express();
app.get("/", (_, res) => res.send("<h1>Yuvi Final Shield Active 🛡️</h1>"));
app.listen(process.env.PORT || 3000);

// Basic folders/files check
if (!fs.existsSync("./cache")) fs.mkdirSync("./cache");
if (!fs.existsSync("./np.txt")) fs.writeFileSync("./np.txt", "No comments available");

global.dpLockLink = global.dpLockLink || {}; 
global.lockedNicknames = global.lockedNicknames || {}; 
global.groupNameLock = global.groupNameLock || {}; 
global.nicknameLockStatus = global.nicknameLockStatus || {}; 
global.activeTargets1 = global.activeTargets1 || new Set();
global.activeTargets2 = global.activeTargets2 || new Set();

// 🔑 APNI OWNER ID
const OWNER_ID = "61595018856726";
const stateFile = "appstate1.json";

function startInstance() {
  try {
    if (!fs.existsSync(stateFile)) {
      console.log(`⚠️ ${stateFile} missing! Bot cannot start.`);
      return;
    }

    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    login({ appState: state }, (err, api) => {
      if (err) {
        console.error(`❌ Login Error:`, err);
        return setTimeout(() => startInstance(), 15000);
      }

      api.setOptions({ listenEvents: true, selfListen: true, autoMarkRead: true });
      const botID = api.getCurrentUserID();
      console.log(`✅ Bot Running Successfully (Bot ID: ${botID}).`);

      // --- 🛡️ 30 SECOND AUTO-CHECK (DP Lock Backup) ---
      setInterval(() => {
        api.getThreadList(25, null, ["INBOX"], (err, list) => {
          if (err || !list) return;
          list.forEach(thread => {
            const savedLink = global.dpLockLink[thread.threadID];
            if (thread.isGroup && savedLink && !thread.imageSrc) { 
              revertDP(api, thread.threadID, savedLink);
            }
          });
        });
      }, 30000);

      api.listenMqtt(async (event) => {
        if (!event) return;
        const { threadID, type, logMessageType, logMessageData, author, senderID } = event;

        // --- 🔒 LOCK REVERT LOGIC ---
        if (type === "event" && author !== OWNER_ID && author !== botID) {
          
          // 1. Group Name Lock Revert (WITH HUMAN-LIKE RANDOM DELAY ~8 SECONDS)
          if (logMessageType === "log:thread-name" && global.groupNameLock[threadID]) {
            const lockedName = global.groupNameLock[threadID];
            
            const randomDelay = Math.floor(Math.random() * (10000 - 6000 + 1)) + 6000;
            console.log(`⏳ Group name change detected. Reverting in ${Math.round(randomDelay/1000)} seconds...`);

            setTimeout(() => {
              api.setTitle(lockedName, threadID, (err) => {
                if (!err) console.log(`🛡️ Name Reverted back to "${lockedName}" in ${threadID}`);
              });
            }, randomDelay);
          }
          
          // 2. Nickname Lock Revert
          if (logMessageType === "log:user-nickname" && global.nicknameLockStatus[threadID]) {
            const tID = logMessageData.participant_id;
            const oldNick = global.lockedNicknames[threadID]?.[tID] || "";
            if (oldNick) api.changeNickname(oldNick, threadID, tID, () => {});
          }
          
          // 3. DP Lock Revert
          if (logMessageType === "log:thread-image" && global.dpLockLink[threadID]) {
            revertDP(api, threadID, global.dpLockLink[threadID]);
          }
        }

        // --- 🎯 TARGET FIGHT (NORMAL MSG, BOT REPLY, OR ANYONE ELSE'S REPLY) ---
        if ((type === "message" || type === "message_reply") && senderID !== OWNER_ID && senderID !== botID) {
          
          // Agar message bhejne wala target list 1 ya 2 me hai
          if (global.activeTargets1.has(senderID) || global.activeTargets2.has(senderID)) {
            sendTargetReply(api, event, senderID, "np.txt");
          }
        }

        // --- ⌨️ COMMANDS ---
        if (event.body && event.body.startsWith("!")) {
          const args = event.body.slice(1).trim().split(/\s+/);
          const cmd = args.shift().toLowerCase();
          handleCommands({ 
            api, event, args, cmd, idNum: 1, OWNER_ID, 
            lockedNicknames: global.lockedNicknames, 
            activeTargets1: global.activeTargets1, 
            activeTargets2: global.activeTargets2, 
            input: args.join(" ") 
          }).catch(e => console.error("Command Error:", e));
        }
      });
    });
  } catch (e) { 
    console.error(`Initialization error:`, e);
    setTimeout(() => startInstance(), 15000); 
  }
}

async function revertDP(api, threadID, link) {
  try {
    const res = await axios.get(link, { responseType: "arraybuffer" });
    const path = `./cache/revert_${threadID}.jpg`;
    fs.writeFileSync(path, Buffer.from(res.data));
    api.changeGroupImage(fs.createReadStream(path), threadID, () => {
      if (fs.existsSync(path)) fs.unlinkSync(path);
    });
  } catch (e) {
    console.error("DP Revert Error:", e.message);
  }
}

function sendTargetReply(api, event, targetID, fileName) {
  try {
    if (!fs.existsSync(fileName)) return;
    const lines = fs.readFileSync(fileName, "utf-8").split("\n").filter(l => l.trim() !== "");
    if (lines.length === 0) return;

    // Target ka real Facebook Name fetch karne ke liye
    api.getUserInfo(targetID, (err, ret) => {
      let targetName = "Hater";
      if (!err && ret && ret[targetID]) {
        targetName = ret[targetID].name;
      }

      const randomMsg = lines[Math.floor(Math.random() * lines.length)];
      const mentionTag = `@${targetName} `;
      const fullText = mentionTag + randomMsg;

      const msgObject = {
        body: fullText,
        mentions: [{
          tag: `@${targetName}`,
          id: targetID
        }]
      };

      setTimeout(() => { 
        api.sendMessage(msgObject, event.threadID, event.messageID); 
      }, 3000); // 3 second delay
    });
  } catch (e) {
    console.error("Target Reply Error:", e);
  }
}

startInstance();
