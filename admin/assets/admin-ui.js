// Auwion Admin — Shared dashboard UI: sidebar/header shell, toasts, confirm
// dialogs, and small render helpers. Depends on admin-client.js being
// loaded first (uses requireAdminSession, adminSignOut).

// ---------------------------------------------------------------------------
// Icon set (small inline SVGs, stroke style, no external icon font needed)
// ---------------------------------------------------------------------------
const ADMIN_ICONS = {
  dashboard: '<path d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6ZM13 3v6h8V3h-8Z"/>',
  pages: '<path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M14 2v6h6" fill="none"/><path d="M8 13h8M8 17h5" stroke-width="1.5" fill="none"/>',
  services: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" fill="none" stroke-width="1.5"/>',
  articles: '<path d="M4 4h13a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V4Z"/><path d="M8 8h7M8 12h7M8 16h4" stroke-width="1.5" fill="none"/>',
  media: '<rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.5" fill="var(--surface)"/><path d="m4 17 5-5 3.5 3.5L17 10l3 3" fill="none" stroke-width="1.6"/>',
  navigation: '<path d="M12 2 4 11h4v9h8v-9h4L12 2Z"/>',
  contact: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 6 9 6 9-6" fill="none" stroke-width="1.5"/>',
  settings: '<circle cx="12" cy="12" r="3.2" fill="none" stroke-width="1.6"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" fill="none" stroke-width="1.3"/>',
  seo: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke-width="1.8"/><path d="m20 20-4.3-4.3" stroke-width="1.8"/>',
  adminUsers: '<circle cx="9" cy="8" r="3.2" fill="none" stroke-width="1.6"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" fill="none" stroke-width="1.6"/><path d="M16 4.2a3.2 3.2 0 0 1 0 6.2M19.5 20c0-2.6-1.7-4.5-4-5.3" fill="none" stroke-width="1.6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18" stroke-width="1.8" fill="none"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke-width="1.8"/><path d="m20 20-4.3-4.3" stroke-width="1.8"/>',
  check: '<path d="M20 6 9 17l-5-5" fill="none" stroke-width="2"/>',
  alert: '<path d="M12 9v4M12 17h.01" stroke-width="2"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" fill="none" stroke-width="1.6"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2" fill="none" stroke-width="1.6"/><path d="M5.5 5h13l2.5 7v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7l2.5-7Z" fill="none" stroke-width="1.6"/>',
};

function icon(key, size) {
  size = size || 17;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' + (ADMIN_ICONS[key] || '') + '</svg>';
}

// ---------------------------------------------------------------------------
// Sidebar sections — only what this actual site needs (matches the
// approved Admin Dashboard sitemap). "superAdminOnly" sections are hidden
// from editors in the sidebar (and the pages themselves also enforce this
// server-side via RLS, and client-side via requireSuperAdmin()).
// ---------------------------------------------------------------------------
const ADMIN_NAV = [
  { key: 'dashboard',   label: 'Dashboard',    href: 'index.html',        icon: 'dashboard' },
  { key: 'pages',       label: 'Pages',        href: 'pages.html',        icon: 'pages' },
  { key: 'services',    label: 'Services',     href: 'services.html',     icon: 'services' },
  { key: 'articles',    label: 'Articles',     href: 'articles.html',     icon: 'articles' },
  { key: 'media',       label: 'Media',        href: 'media.html',        icon: 'media' },
  { key: 'navigation',  label: 'Navigation',   href: 'navigation.html',   icon: 'navigation' },
  { key: 'contact',     label: 'Contact',      href: 'contact.html',      icon: 'contact' },
  { key: 'settings',    label: 'Settings',     href: 'settings.html',     icon: 'settings' },
  { key: 'seo',         label: 'SEO',          href: 'seo.html',          icon: 'seo' },
  { key: 'admin-users', label: 'Admin Users',  href: 'admin-users.html',  icon: 'adminUsers', superAdminOnly: true },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard', pages: 'Pages', services: 'Services', articles: 'Articles',
  media: 'Media Library', navigation: 'Navigation', contact: 'Contact Messages',
  settings: 'Website Settings', seo: 'SEO', 'admin-users': 'Admin Users',
};

// ---------------------------------------------------------------------------
// Shell: renders sidebar + header, runs the auth guard, wires logout.
// Call once per page: const admin = await initAdminShell('pages');
// Returns null (and redirects) if not an authorized admin.
// ---------------------------------------------------------------------------
async function initAdminShell(activeKey) {
  const admin = await requireAdminSession();
  if (!admin) return null;

  document.body.classList.add('admin-body');

  const navHtml = ADMIN_NAV
    .filter(function (item) { return !item.superAdminOnly || admin.role === 'super_admin'; })
    .map(function (item) {
      const activeClass = item.key === activeKey ? ' active' : '';
      return '<a class="sidebar-link' + activeClass + '" href="' + item.href + '">' + icon(item.icon) + '<span>' + item.label + '</span></a>';
    })
    .join('');

  const shellHtml = `
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-brand">
        <a href="../index.html" class="wordmark">AUW<span>I</span>ON</a>
        <span class="admin-tag">Admin</span>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-foot">
        <div class="sidebar-foot-label">Signed in as ${escapeHtml(admin.email)}</div>
      </div>
    </aside>
    <div class="admin-content-col">
      <header class="admin-header">
        <div class="header-left">
          <button class="hamburger-btn" id="hamburgerBtn" aria-label="Toggle menu">${icon('menu', 18)}</button>
          <span class="header-title">${PAGE_TITLES[activeKey] || ''}</span>
        </div>
        <div class="header-right">
          <span class="role-pill">${escapeHtml(admin.role)}</span>
          <span class="header-email">${escapeHtml(admin.email)}</span>
          <button class="btn-logout" id="logoutBtn">Log out</button>
        </div>
      </header>
      <main class="admin-main" id="adminMainSlot"></main>
    </div>
  `;

  document.getElementById('adminShellRoot').innerHTML = shellHtml;
  document.getElementById('toastRoot') || document.body.insertAdjacentHTML('beforeend', '<div class="toast-root" id="toastRoot"></div>');

  // Move the page's own content (already in the HTML, hidden) into the
  // rendered <main> slot, then reveal it.
  const pageContent = document.getElementById('pageContent');
  if (pageContent) {
    document.getElementById('adminMainSlot').appendChild(pageContent);
    pageContent.style.display = 'block';
  }

  // Mobile sidebar toggle
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('hamburgerBtn').addEventListener('click', function () {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', function () {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });

  // Logout with confirmation
  document.getElementById('logoutBtn').addEventListener('click', async function () {
    const confirmed = await confirmDialog({
      title: 'Log out?',
      message: 'You will need to sign in again to make further changes.',
      confirmLabel: 'Log out',
      danger: true,
    });
    if (!confirmed) return;
    await adminSignOut();
    showToast({ type: 'success', message: 'Logged out successfully.' });
    setTimeout(function () { window.location.href = 'login.html?reason=logged-out'; }, 500);
  });

  adminWatchSessionExpiry();

  return admin;
}

// ---------------------------------------------------------------------------
// Guard for super-admin-only pages (Admin Users). Call after initAdminShell.
// ---------------------------------------------------------------------------
function requireSuperAdminOrRedirect(admin) {
  if (admin.role !== 'super_admin') {
    document.getElementById('adminMainSlot').innerHTML = renderStateBlock({
      icon: 'alert',
      title: 'Restricted to Super Admins',
      description: 'Your role (' + admin.role + ') does not have access to this section.',
    });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
function showToast({ type, message, duration }) {
  duration = duration || 3500;
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'success');
  el.innerHTML = icon(type === 'error' ? 'alert' : 'check', 16) + '<span>' + escapeHtml(message) + '</span>';
  root.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity .2s ease';
    el.style.opacity = '0';
    setTimeout(function () { el.remove(); }, 200);
  }, duration);
}

// ---------------------------------------------------------------------------
// Confirm dialog — returns a Promise<boolean>
// ---------------------------------------------------------------------------
function confirmDialog({ title, message, confirmLabel, cancelLabel, danger }) {
  return new Promise(function (resolve) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <h3>${escapeHtml(title || 'Are you sure?')}</h3>
        <p>${escapeHtml(message || '')}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="confirmCancelBtn">${escapeHtml(cancelLabel || 'Cancel')}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmOkBtn">${escapeHtml(confirmLabel || 'Confirm')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function cleanup(result) {
      overlay.remove();
      resolve(result);
    }
    document.getElementById('confirmCancelBtn').addEventListener('click', function () { cleanup(false); });
    document.getElementById('confirmOkBtn').addEventListener('click', function () { cleanup(true); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) cleanup(false); });
  });
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
function renderStateBlock({ icon: iconKey, title, description, actionHtml }) {
  return `
    <div class="state-block">
      ${icon(iconKey || 'inbox', 40)}
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description || '')}</p>
      ${actionHtml || ''}
    </div>
  `;
}

function renderErrorBanner(message) {
  return '<div class="error-banner">' + icon('alert', 16) + '<span>' + escapeHtml(message) + '</span></div>';
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return isoString;
  }
}
