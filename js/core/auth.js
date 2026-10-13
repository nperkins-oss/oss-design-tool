/**
 * auth.js - Azure Static Web Apps Authentication & Corporate Entra ID Guard
 * Orion Security Solutions Design Tool
 * Enforces Microsoft Entra ID Tenant: 222c6535-b279-4f54-b835-30d1a15e8c05
 */
const AuthManager = (function() {
  const ORION_ENTRA_TENANT_ID = "222c6535-b279-4f54-b835-30d1a15e8c05";
  const ALLOWED_EMAIL_DOMAINS = [
    "@orionsecuritysolutions.com",
    "@orionsecurity.com"
  ];

  let currentUser = null;

  function escapeSafe(str) {
    if (typeof window.escapeHTML === "function") return window.escapeHTML(str);
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function extractTenantClaim(principal) {
    if (!principal || !Array.isArray(principal.claims)) return null;
    const tidClaim = principal.claims.find(c =>
      c && (
        c.typ === "tid" ||
        c.typ === "http://schemas.microsoft.com/identity/claims/tenantid"
      )
    );
    return tidClaim && tidClaim.val ? String(tidClaim.val).trim().toLowerCase() : null;
  }

  async function init() {
    const host = (window.location.hostname || "").toLowerCase();
    const isLocalDev =
      !host ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      window.location.protocol === "file:";

    // In local development, bypass Azure edge auth checks
    if (isLocalDev) {
      console.log("[Auth] Local development environment detected — skipping corporate Entra ID guard.");
      renderLocalDevBadge();
      return;
    }

    try {
      const response = await fetch("/.auth/me", { credentials: "same-origin" });
      if (!response.ok) {
        window.location.replace("/login.html");
        return;
      }

      const data = await response.json();
      const principal = data && data.clientPrincipal;

      if (!principal) {
        window.location.replace("/login.html");
        return;
      }

      currentUser = principal;
      const email = String(principal.userDetails || "").trim().toLowerCase();
      const tenantId = extractTenantClaim(principal);

      // 1. Verify Entra ID Tenant ID if present in claims
      const isTenantMismatch = Boolean(tenantId && tenantId !== ORION_ENTRA_TENANT_ID);

      // 2. Strictly verify corporate email domain suffix (no loose substring match)
      const isOrionDomain = ALLOWED_EMAIL_DOMAINS.some(domain => email.endsWith(domain));

      if (isTenantMismatch || !isOrionDomain) {
        renderAccessDenied(email, tenantId);
        return;
      }

      // Validated Orion employee
      renderAuthenticatedUser(principal);
    } catch (err) {
      console.error("[Auth] Error verifying user authentication:", err);
    }
  }

  function renderAccessDenied(email, tenantId = null) {
    const safeEmail = escapeSafe(email || "Unknown Account");
    const safeTenant = tenantId ? escapeSafe(tenantId) : null;
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070b14;color:#f8fafc;font-family:'Inter',system-ui,sans-serif;padding:24px;box-sizing:border-box;">
        <div style="max-width:460px;width:100%;background:#0f172a;border:1px solid #dc2626;border-radius:18px;padding:36px 28px;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);">
          <div style="width:52px;height:52px;border-radius:14px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#ef4444;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:24px;font-weight:bold;">
            ✕
          </div>
          <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:8px;color:#ffffff;letter-spacing:-0.02em;">Corporate Access Restricted</h2>
          <p style="font-size:0.875rem;color:#94a3b8;line-height:1.5;margin-bottom:18px;">
            You are signed in as <strong style="color:#f8fafc;word-break:break-all;">${safeEmail}</strong>.<br/>
            This tool is restricted to authorized <strong style="color:#818cf8;">@orionsecuritysolutions.com</strong> accounts in Entra ID Tenant <code style="font-size:0.75rem;color:#cbd5e1;">${ORION_ENTRA_TENANT_ID}</code>.
            ${safeTenant && safeTenant !== ORION_ENTRA_TENANT_ID ? `<br/><span style="font-size:0.75rem;color:#f87171;">Detected Tenant: ${safeTenant}</span>` : ""}
          </p>
          <div style="margin-bottom:24px;padding:12px;background:#1e293b;border-radius:10px;font-size:0.75rem;color:#cbd5e1;text-align:left;">
            <strong>Need access?</strong> Sign out and log in with your primary Orion Microsoft 365 work credentials.
          </div>
          <a href="/.auth/logout?post_logout_redirect_uri=/login.html" style="display:inline-block;width:100%;padding:12px 20px;background:#ef4444;color:#ffffff;border-radius:10px;font-size:0.875rem;font-weight:600;text-decoration:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(239,68,68,0.35);">
            Sign Out &amp; Switch Account
          </a>
        </div>
      </div>
    `;
  }

  function renderAuthenticatedUser(principal) {
    const email = principal.userDetails || "Orion Engineer";
    const initial = email.charAt(0).toUpperCase();

    const authContainer = document.getElementById("authUserWrapper");
    if (!authContainer) return;

    authContainer.classList.remove("hidden");
    authContainer.classList.add("flex");

    const emailEl = document.getElementById("authUserEmail");
    if (emailEl) {
      emailEl.textContent = email;
      emailEl.title = `Authenticated Orion Entra ID (${ORION_ENTRA_TENANT_ID})`;
    }

    const avatarEl = document.getElementById("authUserAvatar");
    if (avatarEl) avatarEl.textContent = initial;

    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  }

  function renderLocalDevBadge() {
    const authContainer = document.getElementById("authUserWrapper");
    if (!authContainer) return;

    authContainer.classList.remove("hidden");
    authContainer.classList.add("flex");

    const emailEl = document.getElementById("authUserEmail");
    if (emailEl) emailEl.textContent = "Local Dev Mode";

    const avatarEl = document.getElementById("authUserAvatar");
    if (avatarEl) {
      avatarEl.textContent = "DEV";
      avatarEl.className = "px-1 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-mono text-emerald-400 font-bold";
    }

    const logoutLink = authContainer.querySelector("a");
    if (logoutLink) logoutLink.style.display = "none";
  }

  return {
    init,
    getUser: () => currentUser,
    getTenantId: () => ORION_ENTRA_TENANT_ID
  };
})();

// Auto-initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => AuthManager.init());
} else {
  AuthManager.init();
}
