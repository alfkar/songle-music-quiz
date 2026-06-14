const { spawn } = require("child_process");
const readline = require("readline");
const path = require("path");

const ROOT = __dirname;
const SIGNALING_DIR = path.join(ROOT, "signaling-worker");

let tunnelUrl = null;
const procs = [];

function startProc(label, command, cwd) {
  const proc = spawn(command, { cwd, shell: true, windowsHide: true });
  procs.push({ label, proc });

  const onData = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !tunnelUrl) {
      tunnelUrl = match[0];
      console.log(`\n[tunnel] Ready — invite URL: ${tunnelUrl}/online-quiz\n`);
      rl.prompt();
    }
  };

  proc.stdout.on("data", onData);
  proc.stderr.on("data", onData);

  proc.on("exit", (code) => {
    if (code !== null) console.log(`[${label}] stopped (code ${code})`);
  });
}

function killAll() {
  procs.forEach(({ proc }) => {
    try {
      spawn("taskkill", ["/F", "/T", "/PID", String(proc.pid)], { shell: true });
    } catch {}
  });
}

startProc("app", "npm run dev", ROOT);
startProc("signaling", "npm run dev", SIGNALING_DIR);
startProc("tunnel", "cloudflared tunnel --url http://localhost:3000", ROOT);

console.log("Starting services...");
console.log("Commands: url, quit\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "> " });
rl.prompt();

rl.on("line", (line) => {
  switch (line.trim().toLowerCase()) {
    case "url":
    case "u":
      console.log(tunnelUrl ? `${tunnelUrl}/online-quiz` : "Tunnel not ready yet, try again in a moment.");
      break;
    case "quit":
    case "q":
      console.log("Stopping all services...");
      killAll();
      process.exit(0);
      break;
    default:
      if (line.trim()) console.log("Commands: url, quit");
  }
  rl.prompt();
});

process.on("SIGINT", () => {
  killAll();
  process.exit(0);
});
