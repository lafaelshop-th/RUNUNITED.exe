/**
 * protect.js — client-side protection layer
 * - input trim + basic sanitize
 * - honeypot robot check
 * - rate-limit submit attempts (local)
 * - simple anti-automation timing
 * - session token presence check
 * Not a substitute for real server auth. Demo hardening only.
 */

(function (global) {
  "use strict";

  const STORAGE_KEY = "mg_session_v1";
  const RATE_KEY = "mg_rate_v1";
  const MAX_ATTEMPTS = 6;
  const WINDOW_MS = 60 * 1000;

  function now() {
    return Date.now();
  }

  function trimAll(str) {
    if (typeof str !== "string") return "";
    return str.replace(/\s+/g, " ").trim();
  }

  function basicSanitize(str) {
    // strip tags / control chars — not full XSS defense
    return trimAll(str)
      .replace(/[<>]/g, "")
      .replace(/[\u0000-\u001F\u007F]/g, "");
  }

  function getRate() {
    try {
      const raw = localStorage.getItem(RATE_KEY);
      if (!raw) return { count: 0, start: now() };
      return JSON.parse(raw);
    } catch {
      return { count: 0, start: now() };
    }
  }

  function setRate(obj) {
    localStorage.setItem(RATE_KEY, JSON.stringify(obj));
  }

  function checkRateLimit() {
    const r = getRate();
    if (now() - r.start > WINDOW_MS) {
      setRate({ count: 1, start: now() });
      return { ok: true, remaining: MAX_ATTEMPTS - 1 };
    }
    if (r.count >= MAX_ATTEMPTS) {
      const wait = Math.ceil((WINDOW_MS - (now() - r.start)) / 1000);
      return { ok: false, remaining: 0, waitSec: wait };
    }
    r.count += 1;
    setRate(r);
    return { ok: true, remaining: MAX_ATTEMPTS - r.count };
  }

  function isRobot(form) {
    // honeypot: if filled, treat as bot
    const hp = form.querySelector('[name="website"], [name="url"], .hp-field');
    if (hp && trimAll(hp.value).length > 0) return true;
    // timing: form loaded < 800ms ago → suspicious
    const loaded = Number(form.dataset.loadedAt || 0);
    if (loaded && now() - loaded < 800) return true;
    return false;
  }

  function markFormLoad(form) {
    if (form) form.dataset.loadedAt = String(now());
  }

  function setSession(payload) {
    const token = "mg_" + Math.random().toString(36).slice(2) + now().toString(36);
    const data = {
      token,
      name: basicSanitize(payload.name || ""),
      email: basicSanitize(payload.email || ""),
      at: now(),
      member: true
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.token || !data.member) return null;
      // soft expiry 7 days
      if (now() - (data.at || 0) > 7 * 24 * 60 * 60 * 1000) {
        clearSession();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function requireMember(redirectTo) {
    const s = getSession();
    if (!s) {
      window.location.replace(redirectTo || "login.html");
      return null;
    }
    return s;
  }

  function validateLoginFields({ name, email, password }) {
    const n = basicSanitize(name);
    const e = basicSanitize(email).toLowerCase();
    const p = typeof password === "string" ? password : "";

    if (n.length < 2) return { ok: false, msg: "Name too short (min 2)." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, msg: "Invalid email." };
    if (p.length < 6) return { ok: false, msg: "Password min 6 characters." };
    return { ok: true, name: n, email: e, password: p };
  }

  // public API surface (division of "hack api" style endpoints as functions)
  const ProtectAPI = {
    trim: trimAll,
    sanitize: basicSanitize,
    rateCheck: checkRateLimit,
    isRobot,
    markFormLoad,
    setSession,
    getSession,
    clearSession,
    requireMember,
    validateLoginFields,
    // mock "server" check — always accepts valid shape for demo
    async loginAttempt(fields) {
      const rate = checkRateLimit();
      if (!rate.ok) {
        return { ok: false, msg: "Too many tries. Wait " + rate.waitSec + "s." };
      }
      const v = validateLoginFields(fields);
      if (!v.ok) return v;
      // simulated delay
      await new Promise((r) => setTimeout(r, 350 + Math.random() * 250));
      const session = setSession({ name: v.name, email: v.email });
      return { ok: true, session, msg: "Member unlocked." };
    },
    logout() {
      clearSession();
      window.location.href = "index.html";
    }
  };

  global.ProtectAPI = ProtectAPI;
})(typeof window !== "undefined" ? window : globalThis);
