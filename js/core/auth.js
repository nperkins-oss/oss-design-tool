/**
 * auth.js - Azure Static Web Apps Authentication, Corporate Entra ID Guard & RBAC Engine
 * Orion Security Solutions Design Tool
 * Enforces Microsoft Entra ID Tenant: 222c6535-b279-4f54-b835-30d1a15e8c05
 * Supports Entra ID App Roles: OSS.Admin, OSS.LeadEngineer, OSS.Designer, OSS.Viewer
 */
const AuthManager = (function() {
  const ORION_ENTRA_TENANT_ID = "222c6535-b279-4f54-b835-30d1a15e8c05";
  const ALLOWED_EMAIL_DOMAINS = [
    "@orionsecuritysolutions.com",
    "@orionsecurity.com"
  ];

  // Bootstrap Admin accounts (granted OSS.Admin if Entra App Role assignment has not yet propagated)
  const BOOTSTRAP_ADMIN_EMAILS = new Set([
    "nperkins@orionsecuritysolutions.com"
  ]);

  const SIM_STORAGE_KEY = "oss_auth_role_simulation_v1";

  // Canonical Organization Roles mapped to Microsoft Entra ID App Roles
  const ORG_ROLES = {
    admin: {
      id: "admin",
      entraValue: "OSS.Admin",
      label: "OSS Admin",
      shortBadge: "ADMIN",
      rank: 40,
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      description: "Full administrative access across all projects (including Private), lock override, and ownership transfer.",
      canCreateProjects: true,
      canEditOwnProjects: true,
      canViewAllPrivateProjects: true,
      canOverrideLocks: true,
      canLockSubmittals: true,
      canTransferOwnership: true,
      isHardReadOnly: false
    },
    lead_engineer: {
      id: "lead_engineer",
      entraValue: "OSS.LeadEngineer",
      label: "Lead Engineer",
      shortBadge: "LEAD ENG",
      rank: 30,
      badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      description: "Can create/edit projects, publish & freeze official Submittal Revisions, and manage project sharing.",
      canCreateProjects: true,
      canEditOwnProjects: true,
      canViewAllPrivateProjects: false,
      canOverrideLocks: false,
      canLockSubmittals: true,
      canTransferOwnership: true,
      isHardReadOnly: false
    },
    designer: {
      id: "designer",
      entraValue: "OSS.Designer",
      label: "Designer",
      shortBadge: "DESIGNER",
      rank: 20,
      badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
      description: "Standard engineer/estimator access: create private projects, invite collaborators, and edit shared designs.",
      canCreateProjects: true,
      canEditOwnProjects: true,
      canViewAllPrivateProjects: false,
      canOverrideLocks: false,
      canLockSubmittals: false,
      canTransferOwnership: false,
      isHardReadOnly: false
    },
    viewer: {
      id: "viewer",
      entraValue: "OSS.Viewer",
      label: "Viewer (Read-Only)",
      shortBadge: "VIEWER",
      rank: 10,
      badgeClass: "bg-slate-700/60 text-slate-300 border-slate-600",
      description: "Read-only reviewer & field technician access: inspect shared projects, export submittals, or clone local copies.",
      canCreateProjects: false,
      canEditOwnProjects: false,
      canViewAllPrivateProjects: false,
      canOverrideLocks: false,
      canLockSubmittals: false,
      canTransferOwnership: false,
      isHardReadOnly: true
    }
  };

  let currentUser = null;
  let actualEmail = "nperkins@orionsecuritysolutions.com";
  let actualOrgRole = "admin";
  let isLocalDevEnvironment = false;
  let simulatedOverride = null; // { email, role } when testing permissions

  function escapeSafe(str) {
    if (typeof window.escapeHTML === "function") return window.escapeHTML(str);
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeRoleValue(raw) {
    if (!raw) return null;
    const clean = String(raw).trim().toLowerCase().replace(/^oss[._-]/, "");
    if (clean === "admin" || clean === "administrator" || clean === "oss.admin") return "admin";
    if (clean === "leadengineer" || clean === "lead_engineer" || clean === "lead-engineer" || clean === "lead") return "lead_engineer";
    if (clean === "designer" || clean === "engineer" || clean === "estimator") return "designer";
    if (clean === "viewer" || clean === "readonly" || clean === "read_only" || clean === "reader") return "viewer";
    return null;
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

  /**
   * Extracts all Entra ID App Role claims (`roles` / `userRoles`) from SWA clientPrincipal
   * and returns the highest-ranked canonical organization role.
   */
  function extractOrgRoleFromPrincipal(principal, email = "") {
    const matchedRoles = [];

    if (principal && Array.isArray(principal.claims)) {
      for (const c of principal.claims) {
        if (!c || !c.typ || !c.val) continue;
        const typ = String(c.typ).toLowerCase();
        if (
          typ === "roles" ||
          typ === "role" ||
          typ === "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        ) {
          const norm = normalizeRoleValue(c.val);
          if (norm) matchedRoles.push(norm);
        }
      }
    }

    if (principal && Array.isArray(principal.userRoles)) {
      for (const r of principal.userRoles) {
        const norm = normalizeRoleValue(r);
        if (norm) matchedRoles.push(norm);
      }
    }

    if (matchedRoles.length > 0) {
      matchedRoles.sort((a, b) => (ORG_ROLES[b]?.rank || 0) - (ORG_ROLES[a]?.rank || 0));
      return matchedRoles[0];
    }

    // Fallback when Entra App Roles are not yet emitted in claims:
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (BOOTSTRAP_ADMIN_EMAILS.has(cleanEmail)) {
      return "admin";
    }
    return "designer";
  }

  function loadSimulationState() {
    try {
      const raw = localStorage.getItem(SIM_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && ORG_ROLES[parsed.role]) {
        return {
          email: String(parsed.email || actualEmail).trim().toLowerCase(),
          role: parsed.role
        };
      }
    } catch (e) {}
    return null;
  }

  function canUseRoleSimulator() {
    return isLocalDevEnvironment || actualOrgRole === "admin";
  }

  function getUserEmail() {
    if (canUseRoleSimulator() && simulatedOverride && simulatedOverride.email) {
      return simulatedOverride.email;
    }
    return actualEmail || "nperkins@orionsecuritysolutions.com";
  }

  function getOrgRole() {
    if (canUseRoleSimulator() && simulatedOverride && ORG_ROLES[simulatedOverride.role]) {
      return simulatedOverride.role;
    }
    return ORG_ROLES[actualOrgRole] ? actualOrgRole : "designer";
  }

  function getOrgRoleMeta(roleId = null) {
    const r = roleId || getOrgRole();
    return ORG_ROLES[r] || ORG_ROLES.designer;
  }

  /**
   * Computes a user's effective permission on a project given its permissions metadata.
   * Enforces:
   *  1) OSS.Viewer hard Read-Only ceiling
   *  2) OSS.Admin full continuity access (including private projects)
   *  3) Private-by-default visibility (only Owner, invited collaborators, and Admins can view)
   *  4) Submittal Freeze lock (when submittalLocked is true, project is Read-Only until unlocked by Owner/LeadEng/Admin)
   */
  function getEffectiveProjectPermission(projectPermissions = null, userEmailOverride = null, orgRoleOverride = null) {
    const email = String(userEmailOverride || getUserEmail() || "").trim().toLowerCase();
    const orgRole = orgRoleOverride || getOrgRole();
    const roleMeta = getOrgRoleMeta(orgRole);

    const perms = (projectPermissions && typeof projectPermissions === "object")
      ? projectPermissions
      : { ownerEmail: email, visibility: "private", sharedWith: {}, submittalLocked: false };

    const ownerEmail = String(perms.ownerEmail || email).trim().toLowerCase();
    const visibility = ["private", "org_view", "org_edit"].includes(perms.visibility) ? perms.visibility : "private";
    const sharedWith = (perms.sharedWith && typeof perms.sharedWith === "object") ? perms.sharedWith : {};
    const invitedRole = sharedWith[email] || null; // "editor" | "viewer" | null
    const isOwner = Boolean(email && ownerEmail && email === ownerEmail);
    const isSubmittalLocked = Boolean(perms.submittalLocked);
    const lockedBy = perms.lockedBy ? String(perms.lockedBy).trim().toLowerCase() : null;
    const isCheckedOutByOther = Boolean(lockedBy && lockedBy !== email);

    // 1. Check whether user can even SEE this project
    let canView = false;
    if (orgRole === "admin" || isOwner || invitedRole === "editor" || invitedRole === "viewer") {
      canView = true;
    } else if (visibility === "org_view" || visibility === "org_edit") {
      canView = true;
    }

    if (!canView) {
      return {
        level: "none",
        label: "No Access (Private)",
        canView: false,
        canEdit: false,
        canManageSharing: false,
        canLockSubmittal: false,
        canTransferOwnership: false,
        isReadOnly: true,
        isOwner: false,
        visibility,
        ownerEmail,
        reason: "This project is Private to its owner and invited collaborators."
      };
    }

    // 2. Hard Read-Only ceiling for OSS.Viewer role in Entra ID
    if (roleMeta.isHardReadOnly) {
      return {
        level: "viewer",
        label: "Viewer (Entra Read-Only Role)",
        canView: true,
        canEdit: false,
        canManageSharing: false,
        canLockSubmittal: false,
        canTransferOwnership: false,
        isReadOnly: true,
        isOwner,
        visibility,
        ownerEmail,
        reason: "Your Entra ID role (OSS.Viewer) is Read-Only across all projects."
      };
    }

    // 3. Determine base project relationship level ("admin" | "owner" | "editor" | "viewer")
    let baseLevel = "viewer";
    if (orgRole === "admin") {
      baseLevel = isOwner ? "owner" : "admin";
    } else if (isOwner) {
      baseLevel = "owner";
    } else if (invitedRole === "editor" || visibility === "org_edit") {
      baseLevel = "editor";
    } else {
      baseLevel = "viewer";
    }

    const canManageSharing = (baseLevel === "owner" || baseLevel === "admin");
    const canLockSubmittal = (baseLevel === "owner" || baseLevel === "admin" || (baseLevel === "editor" && orgRole === "lead_engineer"));
    const canTransferOwnership = (baseLevel === "owner" || baseLevel === "admin");

    // 4. Check if project is currently frozen via Submittal Lock or checked out by another editor
    if (baseLevel === "viewer") {
      return {
        level: "viewer",
        label: "Read-Only Viewer",
        canView: true,
        canEdit: false,
        canManageSharing: false,
        canLockSubmittal: false,
        canTransferOwnership: false,
        isReadOnly: true,
        isOwner: false,
        visibility,
        ownerEmail,
        reason: invitedRole === "viewer"
          ? `Shared with you as a Read-Only Reviewer by ${ownerEmail}.`
          : `Shared with the organization in Read-Only mode by ${ownerEmail}.`
      };
    }

    if (isSubmittalLocked) {
      return {
        level: baseLevel,
        label: `${baseLevel === "owner" ? "Owner" : baseLevel === "admin" ? "Admin" : "Co-Editor"} • Submittal Locked`,
        canView: true,
        canEdit: false,
        canManageSharing,
        canLockSubmittal,
        canTransferOwnership,
        isReadOnly: true,
        isSubmittalLocked: true,
        isOwner,
        visibility,
        ownerEmail,
        reason: "This project is currently frozen in Submittal Lock mode to protect quoted baselines."
      };
    }

    if (isCheckedOutByOther) {
      return {
        level: baseLevel,
        label: `Checked Out by ${lockedBy}`,
        canView: true,
        canEdit: false,
        canManageSharing,
        canLockSubmittal,
        canTransferOwnership,
        canTakeOverLock: true,
        isReadOnly: true,
        isCheckedOutByOther: true,
        lockedBy,
        isOwner,
        visibility,
        ownerEmail,
        reason: `Currently checked out for editing by ${lockedBy}.`
      };
    }

    return {
      level: baseLevel,
      label: baseLevel === "owner" ? "Project Owner" : baseLevel === "admin" ? "Admin Full Access" : "Co-Editor",
      canView: true,
      canEdit: true,
      canManageSharing,
      canLockSubmittal,
      canTransferOwnership,
      isReadOnly: false,
      isOwner,
      visibility,
      ownerEmail,
      reason: "Full read and write access."
    };
  }

  function setSimulatedIdentity(roleId, emailOverride = null) {
    if (!canUseRoleSimulator()) return;
    if (!roleId || roleId === "reset") {
      simulatedOverride = null;
      try { localStorage.removeItem(SIM_STORAGE_KEY); } catch (e) {}
    } else if (ORG_ROLES[roleId]) {
      const cleanEmail = String(emailOverride || (simulatedOverride && simulatedOverride.email) || actualEmail)
        .trim()
        .toLowerCase();
      simulatedOverride = { role: roleId, email: cleanEmail };
      try { localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(simulatedOverride)); } catch (e) {}
    }
    refreshAuthAndPermissionsUI();
    if (typeof showToast === "function") {
      const meta = getOrgRoleMeta();
      showToast(`Active Identity: ${getUserEmail()} (${meta.entraValue})`);
    }
  }

  function toggleIdentityPopover(ev) {
    if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
    const pop = document.getElementById("authIdentityPopover");
    if (!pop) return;
    const isHidden = pop.classList.contains("hidden");
    if (isHidden) {
      renderIdentityPopover();
      pop.classList.remove("hidden");
    } else {
      pop.classList.add("hidden");
    }
  }

  function closeIdentityPopover() {
    const pop = document.getElementById("authIdentityPopover");
    if (pop) pop.classList.add("hidden");
  }

  function renderIdentityPopover() {
    const pop = document.getElementById("authIdentityPopover");
    if (!pop) return;

    const email = getUserEmail();
    const roleId = getOrgRole();
    const roleMeta = getOrgRoleMeta(roleId);
    const isSimulated = Boolean(canUseRoleSimulator() && simulatedOverride);

    let projPerm = null;
    if (typeof StorageService !== "undefined" && typeof StorageService.getActiveProjectPermissions === "function") {
      projPerm = getEffectiveProjectPermission(StorageService.getActiveProjectPermissions());
    }

    const simSectionHtml = canUseRoleSimulator() ? `
      <div class="mt-3 pt-2.5 border-t border-slate-800">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <i data-lucide="shield-alert" class="w-3 h-3"></i>
            Entra Role &amp; User Simulator
          </span>
          ${isSimulated ? `<button type="button" onclick="AuthManager.setSimulatedIdentity('reset')" class="text-[10px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer">Reset</button>` : ""}
        </div>
        <div class="grid grid-cols-2 gap-1 mb-2">
          ${Object.values(ORG_ROLES).map(r => `
            <button type="button" onclick="AuthManager.setSimulatedIdentity('${r.id}')" class="px-2 py-1 rounded-lg border text-left text-[10px] font-semibold transition-all cursor-pointer ${
              roleId === r.id
                ? "bg-indigo-600/30 border-indigo-400 text-white"
                : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }">
              <div class="font-bold">${escapeSafe(r.shortBadge)}</div>
              <div class="text-[9px] font-mono opacity-75">${escapeSafe(r.entraValue)}</div>
            </button>
          `).join("")}
        </div>
        <div class="space-y-1">
          <label class="block text-[10px] text-slate-400">Simulate Teammate Email (to test Private vs. Shared):</label>
          <div class="flex items-center gap-1">
            <input type="email" id="simUserEmailInput" value="${escapeSafe(email)}" placeholder="teammate@orionsecuritysolutions.com" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-mono focus:outline-none focus:border-indigo-500" />
            <button type="button" onclick="AuthManager.applySimulatedEmailInput()" class="px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors">Apply</button>
          </div>
        </div>
      </div>
    ` : "";

    pop.innerHTML = `
      <div class="p-3 bg-slate-950/90 border-b border-slate-800 flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-white truncate">${escapeSafe(email)}</span>
            ${isSimulated ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">SIM</span>' : ""}
          </div>
          <div class="text-[10px] font-mono text-slate-400 mt-0.5">Entra Tenant: ${ORION_ENTRA_TENANT_ID.slice(0, 13)}...</div>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 ${roleMeta.badgeClass}">
          ${escapeSafe(roleMeta.entraValue)}
        </span>
      </div>
      <div class="p-3 space-y-2.5 text-xs">
        <div class="text-[11px] text-slate-300 leading-relaxed">
          ${escapeSafe(roleMeta.description)}
        </div>
        ${projPerm ? `
          <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Active Project Access</span>
              <span class="text-[10px] font-bold ${projPerm.isReadOnly ? "text-amber-400" : "text-emerald-400"}">${escapeSafe(projPerm.label)}</span>
            </div>
            <div class="text-[10px] text-slate-400">${escapeSafe(projPerm.reason)}</div>
          </div>
        ` : ""}
        <div class="flex items-center justify-between gap-2 pt-1">
          <button type="button" onclick="AuthManager.closeIdentityPopover(); if (typeof openProjectPermissionsModal === 'function') openProjectPermissionsModal();" class="flex-1 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
            <i data-lucide="shield" class="w-3.5 h-3.5"></i>
            <span>Project Permissions</span>
          </button>
          ${!isLocalDevEnvironment ? `
            <a href="/.auth/logout?post_logout_redirect_uri=/login.html" class="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
              <span>Sign Out</span>
            </a>
          ` : ""}
        </div>
        ${simSectionHtml}
      </div>
    `;

    if (typeof window.safeCreateIcons === "function") {
      window.safeCreateIcons(pop);
    }
  }

  function applySimulatedEmailInput() {
    const input = document.getElementById("simUserEmailInput");
    if (!input) return;
    const raw = input.value.trim().toLowerCase();
    if (!raw || !raw.includes("@")) {
      if (typeof showToast === "function") showToast("Enter a valid @orionsecuritysolutions.com email address.");
      return;
    }
    setSimulatedIdentity(getOrgRole(), raw);
  }

  function renderHeaderAuthBadge() {
    const authContainer = document.getElementById("authUserWrapper");
    if (!authContainer) return;

    authContainer.classList.remove("hidden");
    authContainer.classList.add("flex");

    const email = getUserEmail();
    const roleMeta = getOrgRoleMeta();
    const initial = (email || "O").charAt(0).toUpperCase();

    const emailEl = document.getElementById("authUserEmail");
    if (emailEl) {
      emailEl.textContent = email;
      emailEl.title = `${email} • Entra Role: ${roleMeta.entraValue} (${ORION_ENTRA_TENANT_ID})`;
    }

    const avatarEl = document.getElementById("authUserAvatar");
    if (avatarEl) {
      avatarEl.textContent = initial;
      avatarEl.className = "w-5 h-5 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0";
    }

    const roleBadgeEl = document.getElementById("authUserRoleBadge");
    if (roleBadgeEl) {
      roleBadgeEl.textContent = roleMeta.shortBadge;
      roleBadgeEl.className = `px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${roleMeta.badgeClass}`;
    }

    if (typeof window.safeCreateIcons === "function") {
      window.safeCreateIcons(authContainer);
    }
  }

  function refreshAuthAndPermissionsUI() {
    renderHeaderAuthBadge();
    const pop = document.getElementById("authIdentityPopover");
    if (pop && !pop.classList.contains("hidden")) {
      renderIdentityPopover();
    }
    if (typeof StorageService !== "undefined") {
      if (typeof StorageService.refreshProjectPermissionIndicators === "function") {
        StorageService.refreshProjectPermissionIndicators();
      }
      if (typeof StorageService.renderSavedProjectsList === "function") {
        StorageService.renderSavedProjectsList();
      }
    }
  }

  async function init() {
    const loc = (typeof window !== "undefined" && window.location) ? window.location : {};
    const host = String(loc.hostname || "").toLowerCase();
    isLocalDevEnvironment =
      !host ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      loc.protocol === "file:";

    simulatedOverride = loadSimulationState();

    // Close popover when clicking outside
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("click", (ev) => {
        const wrapper = document.getElementById("authUserWrapper");
        if (wrapper && typeof wrapper.contains === "function" && !wrapper.contains(ev.target)) {
          closeIdentityPopover();
        }
      });
    }

    // In local development, bypass Azure edge auth redirect and initialize with Admin dev identity
    if (isLocalDevEnvironment) {
      actualEmail = "nperkins@orionsecuritysolutions.com";
      actualOrgRole = "admin";
      refreshAuthAndPermissionsUI();
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

      // 2. Strictly verify corporate email domain suffix
      const isOrionDomain = ALLOWED_EMAIL_DOMAINS.some(domain => email.endsWith(domain));

      if (isTenantMismatch || !isOrionDomain) {
        renderAccessDenied(email, tenantId);
        return;
      }

      actualEmail = email;
      actualOrgRole = extractOrgRoleFromPrincipal(principal, email);
      refreshAuthAndPermissionsUI();
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

  return {
    init,
    ORG_ROLES,
    getUser: () => currentUser,
    getUserEmail,
    getOrgRole,
    getOrgRoleMeta,
    getTenantId: () => ORION_ENTRA_TENANT_ID,
    isAllowedCorporateEmail: (email) => {
      const clean = String(email || "").trim().toLowerCase();
      return ALLOWED_EMAIL_DOMAINS.some(d => clean.endsWith(d));
    },
    extractOrgRoleFromPrincipal,
    getEffectiveProjectPermission,
    setSimulatedIdentity,
    applySimulatedEmailInput,
    toggleIdentityPopover,
    closeIdentityPopover,
    refreshAuthAndPermissionsUI
  };
})();

window.AuthManager = AuthManager;

// Auto-initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => AuthManager.init());
} else {
  AuthManager.init();
}
