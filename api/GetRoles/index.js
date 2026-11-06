/**
 * api/GetRoles/index.js
 * Azure Static Web Apps Custom Role Source (rolesSource: "/api/GetRoles")
 * Evaluates Microsoft Entra ID App Role claims (OSS.Admin, OSS.LeadEngineer, OSS.Designer, OSS.Viewer),
 * enforces Tenant ID 222c6535-b279-4f54-b835-30d1a15e8c05 & @orionsecuritysolutions.com domain,
 * and returns the user's normalized roles array to Azure Static Web Apps.
 */
const ORION_ENTRA_TENANT_ID = "222c6535-b279-4f54-b835-30d1a15e8c05";
const ALLOWED_EMAIL_DOMAINS = ["@orionsecuritysolutions.com", "@orionsecurity.com"];

function normalizeRoleClaim(val) {
  if (!val) return null;
  const clean = String(val).trim().toLowerCase().replace(/^oss[._-]/, "");
  if (clean === "admin" || clean === "administrator" || clean === "oss.admin") return "OSS.Admin";
  if (clean === "leadengineer" || clean === "lead_engineer" || clean === "lead-engineer" || clean === "lead") return "OSS.LeadEngineer";
  if (clean === "designer" || clean === "engineer" || clean === "estimator") return "OSS.Designer";
  if (clean === "viewer" || clean === "readonly" || clean === "read_only" || clean === "reader") return "OSS.Viewer";
  return null;
}

module.exports = async function (context, req) {
  const body = req.body || {};
  const claims = Array.isArray(body.claims) ? body.claims : [];
  const email = String(body.userDetails || "").trim().toLowerCase();

  // 1. Verify corporate email domain
  const isOrionDomain = ALLOWED_EMAIL_DOMAINS.some(d => email.endsWith(d));
  if (!isOrionDomain) {
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { roles: [] }
    };
    return;
  }

  // 2. Verify Entra ID Tenant claim if present
  const tidClaim = claims.find(c =>
    c && (c.typ === "tid" || c.typ === "http://schemas.microsoft.com/identity/claims/tenantid")
  );
  if (tidClaim && tidClaim.val && String(tidClaim.val).trim().toLowerCase() !== ORION_ENTRA_TENANT_ID) {
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { roles: [] }
    };
    return;
  }

  // 3. Extract Entra ID App Roles from token claims
  const roles = new Set(["orion_verified"]);
  for (const c of claims) {
    if (!c || !c.typ || !c.val) continue;
    const typ = String(c.typ).toLowerCase();
    if (
      typ === "roles" ||
      typ === "role" ||
      typ === "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ) {
      const mapped = normalizeRoleClaim(c.val);
      if (mapped) roles.add(mapped);
    }
  }

  // 4. Bootstrap Admin check via OSS_ADMIN_EMAILS environment variable or primary owner fallback
  const envAdmins = String(process.env.OSS_ADMIN_EMAILS || "nperkins@orionsecuritysolutions.com")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  if (envAdmins.includes(email)) {
    roles.add("OSS.Admin");
  }

  // Default to OSS.Designer if no explicit Entra App Role was assigned yet
  if (
    !roles.has("OSS.Admin") &&
    !roles.has("OSS.LeadEngineer") &&
    !roles.has("OSS.Designer") &&
    !roles.has("OSS.Viewer")
  ) {
    roles.add("OSS.Designer");
  }

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { roles: Array.from(roles) }
  };
};
