// Auwion — Supabase client stub
//
// 1. Create a project at https://supabase.com
// 2. In Project Settings -> API, copy your Project URL and anon public key
// 3. Paste them below
// 4. In Authentication -> Providers, make sure Email is enabled
// 5. Create a `profiles` table (see /supabase/README.md for the SQL) to
//    store the link between a signed-up user and their Odoo client record

const SUPABASE_URL = "https://ecrokcjkcchxjvesqmtb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcm9rY2prY2NoeGp2ZXNxbXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzYwNjQsImV4cCI6MjEwMDA1MjA2NH0.mTwwI6FiGTR_FDR2oPodb5Xdu2xl_ok7EtkY9pooo1E";

// Loaded via CDN script tag in login.html / signup.html / about.html:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//
// NOTE: the local variable below is named `supabaseClient`, not `supabase`,
// because the CDN script above already exposes a global called `supabase`.
// Reusing that name for our own client can throw
// "Identifier 'supabase' has already been declared" in some browsers/CDN
// versions, so we deliberately use a different name (Supabase's own docs
// recommend the same thing, e.g. naming it `_supabase`).
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Sign up ----------
// Called from signup.html. Creates the auth user, then writes a row to
// `profiles` with the company name so it can be matched to an Odoo client
// record (by your team, or automatically by email domain — see README).
async function auwionSignUp({ fullName, companyName, email, password }) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, company_name: companyName } },
  });

  if (error) return { ok: false, message: error.message };

  // Store the company name for matching; RLS policies should restrict
  // this insert to the user's own row (see /supabase/README.md).
  if (data.user) {
    await supabaseClient.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      company_name: companyName,
      match_status: "pending", // "pending" | "matched" | "manual_review"
    });
  }

  return { ok: true };
}

// ---------- Log in ----------
async function auwionLogIn({ email, password }) {
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ---------- Password reset ----------
// Sends a password reset email via Supabase Auth. The user clicks the link
// in that email, which lands them on reset-password.html to set a new one.
async function auwionResetPassword({ email }) {
  try {
    const redirectTo = window.location.origin + "/reset-password.html";
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err && err.message) || "Something went wrong. Please try again." };
  }
}

// ---------- Contact form ----------
// Called from about.html. Writes a row to `contact_messages`. The anon key
// can only insert (see /supabase/contact_messages.sql) — messages are read
// back from the Supabase dashboard, not the site itself.
async function auwionSendMessage({ fullName, email, companyName, interestedIn, message }) {
  try {
    const { error } = await supabaseClient.from("contact_messages").insert({
      full_name: fullName,
      email,
      company_name: companyName,
      interested_in: interestedIn,
      message,
    });

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err && err.message) || "Network error. Please try again." };
  }
}

// ---------- Set new password (from reset-password.html) ----------
// Called after the user arrives via the password reset email link, which
// Supabase uses to establish a temporary authenticated session.
async function auwionUpdatePassword({ newPassword }) {
  try {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err && err.message) || "Something went wrong. Please try again." };
  }
}

// ---------- Log out ----------
async function auwionLogOut() {
  await supabaseClient.auth.signOut();
}

// ---------- Fetch this client's tickets ----------
// Calls the get-tickets Edge Function rather than Odoo directly, so Odoo
// credentials never reach the browser. See /supabase/functions/get-tickets.
async function auwionGetTickets() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return { ok: false, message: "Not logged in" };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, message: "Could not load tickets" };
  return { ok: true, tickets: await res.json() };
}
