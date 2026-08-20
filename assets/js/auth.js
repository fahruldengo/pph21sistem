/* ============================================================
   auth.js — lightweight client-side auth for a single-office tool.
   NOTE: This is front-end-only gating suitable for an internal
   GitHub Pages deployment — it is not a security boundary. For
   real multi-user security, put this behind a server.
   ============================================================ */
window.Auth = (function () {
  const USERS_KEY = "pph21_users";
  const SESSION_KEY = "pph21_session";

  // default account (change after first login)
  const DEFAULT = { username: "admin", name: "Administrator", pass: "vidya2026" };

  function hash(s) {
    // FNV-1a — obfuscation only, not cryptographic
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(16);
  }

  function seedUsers() {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify([
        { username: DEFAULT.username, name: DEFAULT.name, pass: hash(DEFAULT.pass) }
      ]));
    }
  }

  function login(username, password) {
    seedUsers();
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    const u = users.find(x => x.username.toLowerCase() === username.toLowerCase().trim());
    if (!u || u.pass !== hash(password)) return false;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: u.username, name: u.name, ts: Date.now() }));
    return true;
  }

  function logout() { sessionStorage.removeItem(SESSION_KEY); }
  function current() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } }

  // call at top of every protected page
  function guard() {
    if (!current()) {
      const depth = location.pathname.includes("/pages/") ? "../../" : "";
      location.replace(depth + "auth/login.html");
    }
  }

  return { login, logout, current, guard, seedUsers, hash, DEFAULT };
})();
