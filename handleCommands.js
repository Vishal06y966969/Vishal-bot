const axios = require("axios");
const fs = require("fs");

module.exports = async function handleCommands({
  api, event, args, cmd, idNum, OWNER_ID, lockedNicknames, activeTargets1, activeTargets2, input
}) {
  const { threadID, senderID } = event;

  // Security Check: Only Owner can run commands
  if (senderID !== OWNER_ID) return;

  // Global variables fallback
  if (!global.dpLockLink) global.dpLockLink = {};
  if (!global.groupNameLock) global.groupNameLock = {};
  if (!global.nicknameLockStatus) global.nicknameLockStatus = {};
  if (!global.lockedNicknames) global.lockedNicknames = {};

  // ==========================================
  // --- ID 1 COMMANDS ---
  // ==========================================
  if (idNum === 1) {
    
    // 1. DP LOCK
    if (cmd === "dplock") {
      if (!args[0]) return api.sendMessage("❌ Image Link do!", threadID);
      global.dpLockLink[threadID] = args[0];
      try {
        const res = await axios.get(args[0], { responseType: "arraybuffer" });
        const path = `./cache/lock_${threadID}.jpg`;
        
        if (!fs.existsSync("./cache")) fs.mkdirSync("./cache");
        fs.writeFileSync(path, Buffer.from(res.data));

        api.changeGroupImage(fs.createReadStream(path), threadID, (err) => {
          if (fs.existsSync(path)) fs.unlinkSync(path);
          if (err) return api.sendMessage("❌ DP Change Error!", threadID);
          api.sendMessage("🔒 Group DP Locked Successfully 🔥", threadID);
        });
      } catch (e) { 
        api.sendMessage("❌ Invalid Link or Network Error!", threadID); 
      }
    }

    // 2. UNLOCK DP
    if (cmd === "unlockdp") {
      if (global.dpLockLink && global.dpLockLink[threadID]) {
        delete global.dpLockLink[threadID];
        api.sendMessage("🔓 Group DP Unlocked!", threadID);
      } else {
        api.sendMessage("⚠️ Pehle se koi DP Lock nahi hai!", threadID);
      }
    }

    // 3. NAME LOCK
    if (cmd === "namelock") {
      let targetName = input.trim();

      if (targetName) {
        global.groupNameLock[threadID] = targetName;
        api.setTitle(targetName, threadID, (err) => {
          if (err) return api.sendMessage("❌ Name Set karne mein error aaya!", threadID);
          api.sendMessage(`🔒 Group Name Set & Locked: "${targetName}"\n(🔨Lock Ho Gya Sir)`, threadID);
        });
      } 
      else {
        api.getThreadInfo(threadID, (err, info) => {
          if (err || !info) return api.sendMessage("❌ Group Info Fetch Error!", threadID);
          global.groupNameLock[threadID] = info.threadName;
          api.sendMessage(`🔒 Current Group Name Locked: "${info.threadName}"\n(Admin/Member Revert Active)`, threadID);
        });
      }
    }

    // 4. UNLOCK NAME
    if (cmd === "unlockname") {
      if (global.groupNameLock && global.groupNameLock[threadID]) {
        delete global.groupNameLock[threadID];
        api.sendMessage("🔓 Group Name Unlocked!", threadID);
      } else {
        api.sendMessage("⚠️ Pehle se koi Name Lock nahi hai!", threadID);
      }
    }

    // 5. NICKNAME LOCK
    if (cmd === "locknick") {
      api.getThreadInfo(threadID, (err, info) => {
        if (err || !info) return api.sendMessage("❌ Info Fetch Error!", threadID);
        global.nicknameLockStatus[threadID] = true;
        global.lockedNicknames[threadID] = info.nicknames || {};
        api.sendMessage("🔒 All Nicknames Locked by ID 1!", threadID);
      });
    }

    // 6. UNLOCK NICKNAME
    if (cmd === "unlocknick") {
      if (global.nicknameLockStatus && global.nicknameLockStatus[threadID]) {
        global.nicknameLockStatus[threadID] = false;
        if (global.lockedNicknames) delete global.lockedNicknames[threadID];
        api.sendMessage("🔓 All Nicknames Unlocked Successfully!", threadID);
      } else {
        api.sendMessage("⚠️ Pehle se koi Nickname Lock active nahi hai!", threadID);
      }
    }

    // 7. SETALL NICKNAME
    if (cmd === "setall") {
      if (!input) return api.sendMessage("❌ Naam likho!", threadID);
      api.getThreadInfo(threadID, (err, info) => {
        if (err || !info) return api.sendMessage("❌ Info Fetch Error!", threadID);
        api.sendMessage(`⏳ Setting all members nickname to: ${input}...`, threadID);
        info.participantIDs.forEach((id, i) => {
          setTimeout(() => { api.changeNickname(input, threadID, id, () => {}); }, i * 3000);
        });
      });
    }

    // 8. KICK / REMOVE MEMBER
    if (cmd === "kick" || cmd === "remove") {
      let tID = event.messageReply ? event.messageReply.senderID : args[0];
      if (tID) {
        api.removeUserFromGroup(tID, threadID, (err) => {
          if (err) return api.sendMessage("❌ User remove nahi hua! Check karein ki bot Group Admin hai ya nahi.", threadID);
          api.sendMessage("👢 Member successfully kicked from group!", threadID);
        });
      } else {
        api.sendMessage("❌ Jise nikalna hai uske message par reply karo ya UID do!", threadID);
      }
    }

    // 9. PING COMMAND
    if (cmd === "ping") {
      const start = Date.now();
      api.sendMessage("Pong! ⚡", threadID, (err) => {
        if (!err) {
          const latency = Date.now() - start;
          api.sendMessage(`📡 Bot Response Time: ${latency}ms`, threadID);
        }
      });
    }

    // 10. TARGET 1 (FIGHT)
    if (cmd === "target1") {
      let tID = event.messageReply ? event.messageReply.senderID : args[0];
      if (tID) {
        if (activeTargets1.has(tID)) {
          activeTargets1.delete(tID);
          api.sendMessage("⚪ ID 1 Fight OFF", threadID);
        } else {
          activeTargets1.add(tID);
          api.sendMessage("🎯 ID 1 Fight ON!", threadID);
        }
      } else {
        api.sendMessage("❌ Target ke message par reply karo ya UID do!", threadID);
      }
    }
  }

  // ==========================================
  // --- ID 2 COMMANDS ---
  // ==========================================
  if (idNum === 2) {
    if (cmd === "target2") {
      let tID = event.messageReply ? event.messageReply.senderID : args[0];
      if (tID) {
        if (activeTargets2.has(tID)) {
          activeTargets2.delete(tID);
          api.sendMessage("⚪ ID 2 Fight OFF", threadID);
        } else {
          activeTargets2.add(tID);
          api.sendMessage("🎯 ID 2 Fight ON!", threadID);
        }
      } else {
        api.sendMessage("❌ Target ke message par reply karo ya UID do!", threadID);
      }
    }
  }
};
