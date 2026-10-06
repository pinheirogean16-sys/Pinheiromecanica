const fs = require('fs');

try {
  const buf = fs.readFileSync('/app/control-plane-api/control-plane-api');
  const str = buf.toString('latin1');
  const matches = str.match(/\/(health|logs|build|status|run|process|stream|dev)[a-zA-Z0-9_/]*/g);
  if (matches) {
    console.log("Found matches:", Array.from(new Set(matches)).slice(0, 30));
  } else {
    console.log("No matches found");
  }
} catch (e) {
  console.error("Error:", e.message);
}
