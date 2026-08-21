// Auwion Admin — Supabase client + authentication/authorization guard
//
// This file is intentionally SEPARATE from /assets/supabase-client.js used
// by the public site (login.html, signup.html, reset-password.html,
// portal.html, about.html). It is only ever loaded on pages under /admin/,
// so nothing here can affect the existing client-facing auth flow.
//
// It uses the SAME Supabase project and the SAME public "anon" key as the
// rest of the site — that is safe to expose in frontend code, exactly like
// the existing assets/supabase-client.js already does. Access control is
// enforced server-side by Postgres Row Level Security (see
// /supabase/migrations/0001_admin_dashboard_schema.sql), not by hiding this
// key. The Supabase service_role key is NEVER used here or anywhere in the
// frontend.
//
// Loaded via CDN script tag on every /admin/ page, same as the public site:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="assets/admin-client.js"></script>

// This points at your real, connected Supabase project ("Auwion Site",
// ref stodwjjgqzsqjnskyyka) — NOT the placeholder URL/key that ship in
// the public site's assets/supabase-client.js, which were left untouched
// per your instruction and remain disconnected from any real backend.
const ADMIN_SUPABASE_URL = "https://stodwjjgqzsqjnskyyka.supabase.co";
const ADMIN_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0b2R3ampncXpzcWpuc2t5eWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDM2NDIsImV4cCI6MjEwMjUxOTY0Mn0.E9vXhxFvmpsfki8iZhtOyhn-X-mOgXXpUaEdgLiAnZA";

// A distinct storageKey keeps an admin session and a client-portal session
// (from login.html) from ever colliding if both are ever opened by the same
// browser profile — each is stored independently in localStorage.
const adminSupabase = window.supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'auwion-admin-auth',
    persistSession: true,
    autoRefreshToken: true,
  }
});

// ---------- Look up the current session's admin_users row, if any ----------
// Returns one of:
//   { authenticated:false, authorized:false, admin:null }               -> no session at all
//   { authenticated:true,  authorized:false, admin:null }               -> logged in, but not an admin (or disabled)
//   { authenticated:true,  authorized:true,  admin:{...} }              -> logged in admin, active
async function adminGetAuthorizedAdmin() {
  const { data: sessionData, error: sessionError } = await adminSupabase.auth.getSession();
  const session = sessionData?.session;

  if (sessionError || !session) {
    return { authenticated: false, authorized: false, admin: null };
  }

  const { data: adminRow, error: adminError } = await adminSupabase
    .from('admin_users')
    .select('id, email, full_name, role, status')
    .eq('id', session.user.id)
    .maybeSingle();

  if (adminError || !adminRow || adminRow.status !== 'active') {
    return { authenticated: true, authorized: false, admin: null };
  }

  return { authenticated: true, authorized: true, admin: adminRow };
}

// ---------- Sign in + authorize in one step (used by login.html) ----------
async function adminSignIn({ email, password }) {
  const { data, error } = await adminSupabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: 'Invalid email or password.' };
  }

  const { data: adminRow, error: adminError } = await adminSupabase
    .from('admin_users')
    .select('id, email, full_name, role, status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (adminError || !adminRow || adminRow.status !== 'active') {
    // Valid Supabase login (could be a normal client account from
    // signup.html), but not an authorized admin — end the session
    // immediately rather than leaving them signed in with no access.
    await adminSupabase.auth.signOut();
    return { ok: false, message: 'This account does not have admin access.' };
  }

  // Best-effort login timestamp; never blocks sign-in if it fails.
  try {
    await adminSupabase.rpc('record_admin_login');
  } catch (e) { /* non-fatal */ }

  return { ok: true, admin: adminRow };
}

// ---------- Sign out ----------
async function adminSignOut() {
  await adminSupabase.auth.signOut();
}

// ---------- Forgot password: step 1, request the reset email ----------
// Always returns ok:true regardless of whether the email actually belongs
// to an admin (or exists at all) — this deliberately avoids revealing
// which email addresses have admin accounts to whoever is at the form.
async function adminRequestPasswordReset({ email }) {
  try {
    await adminSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname.replace('forgot-password.html', 'reset-password.html'),
    });
  } catch (e) { /* fall through to the same generic response either way */ }
  return { ok: true };
}

// ---------- Forgot password: step 2, set the new password ----------
// Called from reset-password.html after the admin arrives via the emailed
// link. Supabase's client automatically turns that link's token into a
// temporary "recovery" session (see detectSessionInUrl, on by default), so
// this just needs to update the password on that session.
async function adminUpdatePassword({ password }) {
  const { error } = await adminSupabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, message: error.message || 'Could not update password. The reset link may have expired.' };
  }
  return { ok: true };
}

// ---------- Detect an active password-recovery session ----------
// Used by reset-password.html to decide whether to show the "set new
// password" form (valid recovery link) or an error state (missing/expired
// link, or the page was opened directly without going through email).
async function adminHasRecoverySession() {
  const { data } = await adminSupabase.auth.getSession();
  return !!data?.session;
}

// ---------- Route guard: call at the top of every protected admin page ----------
// Redirects to login.html if there's no session, or if the session belongs
// to someone who isn't an active admin (and ends that session so they can't
// silently retry). Returns the admin_users row on success so the calling
// page can render the admin's name/role.
async function requireAdminSession() {
  const result = await adminGetAuthorizedAdmin();

  if (!result.authenticated) {
    window.location.href = 'login.html';
    return null;
  }

  if (!result.authorized) {
    await adminSupabase.auth.signOut();
    window.location.href = 'login.html?reason=unauthorized';
    return null;
  }

  return result.admin;
}

// ---------- Session-expiration watcher ----------
// Supabase's client auto-refreshes the access token in the background as
// long as the tab is open. If the underlying refresh token itself has
// expired or been revoked (e.g. the admin's browser was closed for a long
// time, or they were signed out elsewhere), the SDK fires SIGNED_OUT, or a
// TOKEN_REFRESHED event with no session. Either case should bounce the
// admin back to the login screen instead of leaving a dead page on screen.
function adminWatchSessionExpiry() {
  adminSupabase.auth.onAuthStateChange((event, session) => {
    const onLoginPage = window.location.pathname.endsWith('login.html');

    if (event === 'SIGNED_OUT' && !onLoginPage) {
      window.location.href = 'login.html?reason=expired';
    }
    if (event === 'TOKEN_REFRESHED' && !session && !onLoginPage) {
      window.location.href = 'login.html?reason=expired';
    }
  });
}
