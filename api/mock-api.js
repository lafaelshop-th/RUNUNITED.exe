/**
 * api/mock-api.js — optional Node mock if you want a tiny local server
 * Division of "hack / protect API" as separate endpoints.
 *
 * Run: node api/mock-api.js
 * Then open http://127.0.0.1:8787/
 *
 * Endpoints:
 *   POST /api/login   { name, email, password }
 *   GET  /api/me      (header: X-Session)
 *   POST /api/logout
 *   GET  /api/health
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 8787;
const ROOT = path.join(__dirname, "..");
const sessions = new Map(); // token -> { name, email, at }

function json(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Session",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => {
      buf += c;
      if (buf.length > 1e6) {
        reject(new Error("too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        reject(new Error("bad json"));
      }
    });
  });
}

function trim(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, urlPath.replace(/^\//, ""));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("not found");
    }
    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return json(res, 204, {});
  }

  const url = req.url.split("?")[0];

  if (url === "/api/health" && req.method === "GET") {
    return json(res, 200, { ok: true, service: "member-gate-mock", ts: Date.now() });
  }

  if (url === "/api/login" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const name = trim(body.name);
      const email = trim(body.email).toLowerCase();
      const password = String(body.password || "");
      if (name.length < 2) return json(res, 400, { ok: false, msg: "Name too short" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { ok: false, msg: "Invalid email" });
      if (password.length < 6) return json(res, 400, { ok: false, msg: "Password min 6" });
      const token = crypto.randomBytes(24).toString("hex");
      sessions.set(token, { name, email, at: Date.now() });
      return json(res, 200, { ok: true, token, name, email, msg: "Member unlocked" });
    } catch {
      return json(res, 400, { ok: false, msg: "Bad request" });
    }
  }

  if (url === "/api/me" && req.method === "GET") {
    const token = req.headers["x-session"] || "";
    const s = sessions.get(token);
    if (!s) return json(res, 401, { ok: false, msg: "No session" });
    return json(res, 200, { ok: true, name: s.name, email: s.email });
  }

  if (url === "/api/logout" && req.method === "POST") {
    const token = req.headers["x-session"] || "";
    sessions.delete(token);
    return json(res, 200, { ok: true });
  }

  // static files for the rest
  return serveStatic(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("MemberGate mock listening http://127.0.0.1:" + PORT + "/");
  console.log("API: POST /api/login  GET /api/me  POST /api/logout  GET /api/health");
});
