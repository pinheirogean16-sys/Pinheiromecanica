const fs = require('fs');
const path = require('path');

function checkFd(pid) {
  try {
    const fdPath = `/proc/${pid}/fd`;
    const fds = fs.readdirSync(fdPath);
    for (const fd of fds) {
      if (fd === '1' || fd === '2') {
        const fullLink = path.join(fdPath, fd);
        try {
          const target = fs.readlinkSync(fullLink);
          console.log(`Process ${pid} FD ${fd} targets: ${target}`);
        } catch (e) {}
      }
    }
  } catch (e) {}
}

function run() {
  console.log("Scanning /proc for active process FDs...");
  try {
    const list = fs.readdirSync('/proc');
    for (const item of list) {
      if (/^\d+$/.test(item)) {
        checkFd(item);
      }
    }
  } catch(e) {
    console.error("Failed to list /proc:", e.message);
  }
}

run();
