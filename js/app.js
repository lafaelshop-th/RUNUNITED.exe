/**
 * app.js — page wiring for gate / login / main
 */

(function () {
  "use strict";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function pageName() {
    const p = location.pathname.split("/").pop() || "index.html";
    return p.toLowerCase();
  }

  onReady(function () {
    const name = pageName();
    const session = window.ProtectAPI ? ProtectAPI.getSession() : null;

    // shared logout buttons
    document.querySelectorAll("[data-logout]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.ProtectAPI) ProtectAPI.logout();
        else location.href = "index.html";
      });
    });

    // INDEX — first page gate
    if (name === "index.html" || name === "" || name === "/") {
      const statusEl = $("#gate-status-text");
      const cta = $("#cta-enter");
      if (session) {
        if (statusEl) statusEl.textContent = "Member session active — " + (session.name || "you");
        if (cta) {
          cta.textContent = "Enter main";
          cta.href = "main.html";
        }
      } else {
        if (statusEl) statusEl.textContent = "Not a member yet — login required";
        if (cta) {
          cta.textContent = "Continue to login";
          cta.href = "login.html";
        }
      }
    }

    // LOGIN
    if (name === "login.html") {
      if (session) {
        location.replace("main.html");
        return;
      }
      const form = $("#login-form");
      if (!form) return;
      ProtectAPI.markFormLoad(form);
      const msg = $("#login-msg");
      const btn = form.querySelector('button[type="submit"]');

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (msg) {
          msg.className = "msg";
          msg.textContent = "";
        }
        if (ProtectAPI.isRobot(form)) {
          if (msg) {
            msg.className = "msg err";
            msg.textContent = "Robot check failed.";
          }
          return;
        }
        const nameVal = form.name.value;
        const emailVal = form.email.value;
        const passVal = form.password.value;
        if (btn) btn.disabled = true;
        try {
          const res = await ProtectAPI.loginAttempt({
            name: nameVal,
            email: emailVal,
            password: passVal
          });
          if (msg) {
            msg.className = "msg " + (res.ok ? "ok" : "err");
            msg.textContent = res.msg || (res.ok ? "OK" : "Failed");
          }
          if (res.ok) {
            setTimeout(() => {
              location.href = "main.html";
            }, 500);
          }
        } catch (err) {
          if (msg) {
            msg.className = "msg err";
            msg.textContent = "Network error.";
          }
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    // MAIN — require member
    if (name === "main.html") {
      const s = ProtectAPI.requireMember("login.html");
      if (!s) return;
      const greet = $("#member-name");
      if (greet) greet.textContent = s.name || s.email || "Member";
      const emailLine = $("#member-email");
      if (emailLine) emailLine.textContent = s.email || "";
    }
  });
})();
