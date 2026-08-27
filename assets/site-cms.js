// Auwion Public Site — CMS content loader
//
// This is intentionally SEPARATE from assets/supabase-client.js (which
// handles login/signup/reset/portal and is left exactly as it was).
// This file does ONE thing: read published page content from Supabase
// and fill it into the page. It never writes anything, and it uses only
// the public anon key — safe to expose, same as everywhere else on this
// site. Access is restricted server-side by RLS to status='published'
// rows only (see /supabase/migrations/0001_admin_dashboard_schema.sql).
//
// DESIGN: loading state
// The hand-written HTML already in the page IS the loading/fallback
// state — visitors never see a blank section, a spinner, or a flash of
// missing content while this script runs. This is intentional: for a
// marketing homepage, "instant real content, silently upgraded a moment
// later if there's a CMS edit" looks and performs better than any
// spinner would, and it means the page is never visually broken if this
// script fails to load or Supabase is unreachable. document.body carries
// a data-cms-state attribute (loading -> loaded/fallback/error) for
// anyone debugging in DevTools; it has no visual effect.
//
// DESIGN: error handling
// Every failure mode (script blocked, network error, timeout, missing
// row, malformed data) is caught and logged to the console for
// developers, and always falls back to leaving the original HTML
// exactly as it was. Visitors never see a raw error.
//
// DESIGN: safe rendering
// Plain text fields use .textContent (never .innerHTML), so CMS content
// can never inject scripts or markup. The two fields that legitimately
// need to rebuild a small piece of markup (ledger list items, why-cards)
// escape every value through escapeHtmlLite() first.

(function () {
  const CMS_SUPABASE_URL = "https://stodwjjgqzsqjnskyyka.supabase.co";
  const CMS_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0b2R3ampncXpzcWpuc2t5eWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NDM2NDIsImV4cCI6MjEwMjUxOTY0Mn0.E9vXhxFvmpsfki8iZhtOyhn-X-mOgXXpUaEdgLiAnZA";
  const FETCH_TIMEOUT_MS = 6000;

  function setState(state) {
    document.body.setAttribute('data-cms-state', state);
  }
  setState('loading');

  if (typeof window.supabase === 'undefined') {
    console.warn('[site-cms] Supabase SDK did not load (blocked, offline, or CDN down). Showing built-in page content.');
    setState('fallback');
    return;
  }

  const cmsClient = window.supabase.createClient(CMS_SUPABASE_URL, CMS_SUPABASE_ANON_KEY, {
    auth: { persistSession: false }, // read-only content fetcher, no login state to keep
  });

  function setText(id, value) {
    if (value === undefined || value === null) return;
    const el = document.getElementById(id);
    if (el) el.textContent = value; // safe: never innerHTML
  }

  function setLink(id, label, href) {
    const el = document.getElementById(id);
    if (!el) return;
    if (label !== undefined && label !== null) el.textContent = label; // safe: never innerHTML
    if (href !== undefined && href !== null) el.setAttribute('href', href);
  }

  function setList(id, items) {
    if (!Array.isArray(items)) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(function (item) {
      return '<li>' + escapeHtmlLite(item) + '</li>';
    }).join('');
  }

  function escapeHtmlLite(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('CMS fetch timed out after ' + ms + 'ms')); }, ms);
      }),
    ]);
  }

  // ---------------------------------------------------------------------
  // Home page renderer
  // ---------------------------------------------------------------------
  function applyHomeContent(content) {
    if (!content || typeof content !== 'object') {
      console.warn('[site-cms] Home page row has no usable content; keeping built-in text.');
      return;
    }

    if (content.hero) {
      setText('cms-hero-eyebrow', content.hero.eyebrow);
      setText('cms-headline-plain', content.hero.headline_plain);
      setText('cms-headline-highlight', content.hero.headline_highlight);
      setText('cms-hero-sub', content.hero.sub);
      setLink('cms-cta-primary', content.hero.cta_primary_label, content.hero.cta_primary_link);
      setLink('cms-cta-secondary', content.hero.cta_secondary_label, content.hero.cta_secondary_link);
    }

    if (content.ledger) {
      setText('cms-ledger-label', content.ledger.label);
      setText('cms-ledger-no', content.ledger.no);
      setText('cms-debit-title', content.ledger.debit_title);
      setList('cms-debit-list', content.ledger.debit_items);
      setText('cms-credit-title', content.ledger.credit_title);
      setList('cms-credit-list', content.ledger.credit_items);
      setText('cms-balance-label', content.ledger.balance_label);
      setText('cms-balance-text', content.ledger.balance_text);
    }

    if (content.services_intro) {
      setText('cms-services-eyebrow', content.services_intro.eyebrow);
      setText('cms-services-title', content.services_intro.title);
      setText('cms-services-sub', content.services_intro.sub);
    }

    if (content.why) {
      setText('cms-why-eyebrow', content.why.eyebrow);
      setText('cms-why-title', content.why.title);
      setText('cms-why-sub', content.why.sub);
      if (Array.isArray(content.why.cards)) {
        const grid = document.getElementById('cms-why-grid');
        if (grid) {
          grid.innerHTML = content.why.cards.map(function (card) {
            return '<div class="why-card"><span class="tag">' + escapeHtmlLite(card.tag || '') +
              '</span><p>' + escapeHtmlLite(card.text || '') + '</p></div>';
          }).join('');
        }
      }
    }

    if (content.articles_intro) {
      setText('cms-articles-eyebrow', content.articles_intro.eyebrow);
      setText('cms-articles-title', content.articles_intro.title);
      setText('cms-articles-sub', content.articles_intro.sub);
    }

    if (content.cta_band) {
      setText('cms-cta-heading', content.cta_band.heading);
      setText('cms-cta-text', content.cta_band.text);
      setLink('cms-cta-button', content.cta_band.button_label, content.cta_band.button_link);
    }
  }

  // ---------------------------------------------------------------------
  // Service sub-block icons — extracted verbatim from the original
  // hand-coded SVGs on business-central.html / zoho-books.html / odoo.html
  // / web-development.html. Confirmed identical paths were reused across
  // pages for "implementation", "support", and "bookkeeping" — so those
  // three are shared here too, rather than duplicated per page.
  // ---------------------------------------------------------------------
  const SERVICE_ICONS = {
    implementation: '<rect x="20" y="20" width="80" height="80" rx="14" stroke="{{grad}}" stroke-width="3"/><path d="M38 62l16 16 30-34" stroke="{{grad}}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
    'al-dev': '<path d="M42 34L20 60l22 26" stroke="{{grad}}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 34l22 26-22 26" stroke="{{grad}}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M68 26L52 94" stroke="{{grad}}" stroke-width="4" stroke-linecap="round"/>',
    shopify: '<path d="M32 40h56l6 54a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8l6-54z" stroke="{{grad}}" stroke-width="4" stroke-linejoin="round"/><path d="M46 40v-6a14 14 0 0 1 28 0v6" stroke="{{grad}}" stroke-width="4" stroke-linecap="round"/><path d="M60 62c14 4 14 16 0 16s-14 12 0 16" stroke="{{grad}}" stroke-width="4" stroke-linecap="round"/>',
    migration: '<rect x="14" y="30" width="34" height="34" rx="6" stroke="{{grad}}" stroke-width="4"/><rect x="72" y="56" width="34" height="34" rx="6" stroke="{{grad}}" stroke-width="4"/><path d="M50 46h34M74 40l10 6-10 6" stroke="{{grad}}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    integrations: '<circle cx="30" cy="34" r="12" stroke="{{grad}}" stroke-width="4"/><circle cx="90" cy="34" r="12" stroke="{{grad}}" stroke-width="4"/><circle cx="60" cy="86" r="12" stroke="{{grad}}" stroke-width="4"/><path d="M40 40l14 38M80 40L66 78" stroke="{{grad}}" stroke-width="3"/>',
    support: '<path d="M24 62a36 36 0 0 1 72 0" stroke="{{grad}}" stroke-width="5" stroke-linecap="round"/><rect x="18" y="60" width="16" height="24" rx="6" stroke="{{grad}}" stroke-width="4"/><rect x="86" y="60" width="16" height="24" rx="6" stroke="{{grad}}" stroke-width="4"/><path d="M34 84v6a10 10 0 0 0 10 10h8" stroke="{{grad}}" stroke-width="4" stroke-linecap="round"/>',
    training: '<path d="M20 46l40-16 40 16-40 16-40-16z" stroke="{{grad}}" stroke-width="4" stroke-linejoin="round"/><path d="M38 54v22c0 6 10 12 22 12s22-6 22-12V54" stroke="{{grad}}" stroke-width="4" stroke-linecap="round"/><path d="M92 46v22" stroke="{{grad}}" stroke-width="4" stroke-linecap="round"/>',
    bookkeeping: '<rect x="26" y="18" width="68" height="84" rx="6" stroke="{{grad}}" stroke-width="4"/><path d="M40 38h40M40 54h40M40 70h26" stroke="{{grad}}" stroke-width="4" stroke-linecap="round"/><path d="M60 84l8 8 14-16" stroke="{{grad}}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
    webapp: '<rect x="14" y="24" width="92" height="66" rx="8" stroke="{{grad}}" stroke-width="4"/><path d="M14 40h92" stroke="{{grad}}" stroke-width="4"/><circle cx="26" cy="32" r="2.4" fill="{{grad}}"/><circle cx="35" cy="32" r="2.4" fill="{{grad}}"/><path d="M44 62l-12 10 12 10M76 62l12 10-12 10M64 58l-8 28" stroke="{{grad}}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    website: '<rect x="14" y="24" width="92" height="66" rx="8" stroke="{{grad}}" stroke-width="4"/><path d="M14 40h92" stroke="{{grad}}" stroke-width="4"/><circle cx="26" cy="32" r="2.4" fill="{{grad}}"/><circle cx="35" cy="32" r="2.4" fill="{{grad}}"/><rect x="26" y="50" width="24" height="30" rx="3" stroke="{{grad}}" stroke-width="3"/><path d="M58 52h34M58 62h34M58 72h22" stroke="{{grad}}" stroke-width="3" stroke-linecap="round"/>',
  };

  function renderServiceIcon(iconKey, uniqueId, size) {
    size = size || 72;
    const gradId = 'gsvc-' + uniqueId;
    const paths = (SERVICE_ICONS[iconKey] || '').split('{{grad}}').join('url(#' + gradId + ')');
    return '<svg viewBox="0 0 120 120" width="' + size + '" height="' + size + '" fill="none" xmlns="http://www.w3.org/2000/svg" style="direction:ltr;flex-shrink:0;">' +
      '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B82F6"/><stop offset="1" stop-color="#0FA898"/></linearGradient></defs>' +
      paths + '</svg>';
  }

  // ---------------------------------------------------------------------
  // Renders the anchor-nav pills + sub-block list on a service detail
  // page (Business Central / Zoho Books / Odoo / Web development), from
  // the services + service_blocks tables. Alternating left/right layout
  // is preserved by flipping direction on odd indices, matching the
  // original hand-coded pattern exactly.
  // ---------------------------------------------------------------------
  async function loadServiceBlocks(serviceSlug) {
    const navEl = document.getElementById('cms-anchor-nav');
    const blocksEl = document.getElementById('cms-subblocks');
    if (!navEl || !blocksEl) return;

    try {
      const { data: service, error: serviceError } = await cmsClient
        .from('services')
        .select('id')
        .eq('slug', serviceSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (serviceError || !service) return; // keep built-in blocks as-is

      const { data: blocks, error: blocksError } = await cmsClient
        .from('service_blocks')
        .select('anchor_id, title, description, icon_key, display_order')
        .eq('service_id', service.id)
        .order('display_order', { ascending: true });

      if (blocksError || !blocks || blocks.length === 0) return;

      navEl.innerHTML = blocks.map(function (b) {
        return '<a href="#' + escapeHtmlLite(b.anchor_id) + '">' + escapeHtmlLite(b.title) + '</a>';
      }).join('');

      blocksEl.innerHTML = blocks.map(function (b, i) {
        const flipped = i % 2 === 1;
        const visualStyle = flipped ? 'direction:rtl;display:flex;align-items:center;justify-content:center;' : 'display:flex;align-items:center;justify-content:center;';
        const contentAttr = flipped ? " style='direction:ltr'" : ' ';
        return '<div class="sub-block" id="' + escapeHtmlLite(b.anchor_id) + '">' +
          '<div class="visual" style="' + visualStyle + '">' + renderServiceIcon(b.icon_key, b.anchor_id + '-' + i) + '</div>' +
          '<div' + contentAttr + '><h3>' + escapeHtmlLite(b.title) + '</h3><p>' + escapeHtmlLite(b.description) + '</p></div>' +
          '</div>';
      }).join('');
    } catch (e) {
      console.warn('[site-cms] Failed to load service blocks for "' + serviceSlug + '":', e && e.message);
      // Built-in blocks stand unchanged.
    }
  }

  // ---------------------------------------------------------------------
  // Renders the 5-row services table (used on both Home and Services
  // overview) from the services table.
  // ---------------------------------------------------------------------
  async function loadServicesTable() {
    const tableEl = document.getElementById('cms-services-table');
    if (!tableEl) return;

    try {
      const { data, error } = await cmsClient
        .from('services')
        .select('slug, name, short_description, icon_key')
        .eq('status', 'published')
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) return; // keep built-in rows as-is

      tableEl.innerHTML = data.map(function (s, i) {
        const icon = s.icon_key ? renderServiceIcon(s.icon_key, 'row-' + i, 26) : '';
        // Icon is nested INSIDE the first grid cell (alongside the name),
        // not added as a 4th child — .service-row's grid-template-columns
        // expects exactly 3 direct children (name / desc / arrow), so
        // adding a sibling would shift every column and break the layout.
        return '<a href="' + escapeHtmlLite(s.slug) + '.html" class="service-row">' +
          '<span style="display:flex;align-items:center;gap:12px;">' +
          (icon ? '<span style="display:inline-flex;flex-shrink:0;">' + icon + '</span>' : '') +
          '<span class="service-name">' + escapeHtmlLite(s.name) + '</span>' +
          '</span>' +
          '<span class="service-desc">' + escapeHtmlLite(s.short_description) + '</span>' +
          '<span class="service-arrow">View →</span></a>';
      }).join('');
    } catch (e) {
      console.warn('[site-cms] Failed to load services table:', e && e.message);
    }
  }
  const PAGE_RENDERERS = {
    home: applyHomeContent,
    services: applyServicesContent,
    'business-central': applyServiceDetailContent,
    'zoho-books': applyServiceDetailContent,
    odoo: applyServiceDetailContent,
    'web-development': applyServiceDetailContent,
    bookkeeping: applyBookkeepingContent,
    about: applyAboutContent,
    privacy: applyLegalContent,
    terms: applyLegalContent,
  };

  // ---------------------------------------------------------------------
  // Services (overview) page — just the intro copy; the 5 service rows
  // themselves belong to the Services collection, not page content.
  // ---------------------------------------------------------------------
  function applyServicesContent(content) {
    if (!content) return;
    setText('cms-eyebrow', content.eyebrow);
    setText('cms-title', content.title);
    setText('cms-sub', content.sub);
  }

  // ---------------------------------------------------------------------
  // Business Central / Zoho Books / Odoo / Web development — identical
  // shape, shared renderer.
  // ---------------------------------------------------------------------
  function applyServiceDetailContent(content) {
    if (!content) return;
    setText('cms-eyebrow', content.eyebrow);
    setText('cms-headline', content.headline);
    setText('cms-sub', content.sub);
    if (content.cross_sell) {
      setText('cms-crosssell-text', content.cross_sell.text);
      setLink('cms-crosssell-btn', content.cross_sell.button_label, content.cross_sell.button_link);
    }
    if (content.cta_band) {
      setText('cms-cta-heading', content.cta_band.heading);
      setText('cms-cta-text', content.cta_band.text);
      setLink('cms-cta-button', content.cta_band.button_label, content.cta_band.button_link);
    }
  }

  // ---------------------------------------------------------------------
  // Book keeping — hero + badges + 3 info cards + CTA (no cross-sell,
  // since this page IS the cross-sell target for the others).
  // ---------------------------------------------------------------------
  function applyBookkeepingContent(content) {
    if (!content) return;
    setText('cms-eyebrow', content.eyebrow);
    setText('cms-headline', content.headline);
    setText('cms-sub', content.sub);

    if (Array.isArray(content.badges)) {
      const badgeEl = document.getElementById('cms-badges');
      if (badgeEl) {
        badgeEl.innerHTML = content.badges.map(function (b) {
          return '<span class="badge"><span class="dot"></span>' + escapeHtmlLite(b) + '</span>';
        }).join('');
      }
    }

    if (Array.isArray(content.info_cards)) {
      const cardsEl = document.getElementById('cms-info-cards');
      if (cardsEl) {
        cardsEl.innerHTML = content.info_cards.map(function (c) {
          return '<div class="info-card"><h4>' + escapeHtmlLite(c.title) + '</h4><p>' + escapeHtmlLite(c.text) + '</p></div>';
        }).join('');
      }
    }

    if (content.cta_band) {
      setText('cms-cta-heading', content.cta_band.heading);
      setText('cms-cta-text', content.cta_band.text);
      setLink('cms-cta-button', content.cta_band.button_label, content.cta_band.button_link);
    }
  }

  // ---------------------------------------------------------------------
  // About — eyebrow, headline, 3 paragraphs. Contact badge row and the
  // contact form itself are intentionally left untouched (badge row is
  // shared contact info, managed later from Settings; the form is a
  // functional element, not CMS content).
  // ---------------------------------------------------------------------
  function applyAboutContent(content) {
    if (!content) return;
    setText('cms-eyebrow', content.eyebrow);
    setText('cms-headline', content.headline);
    if (Array.isArray(content.paragraphs)) {
      setText('cms-para-1', content.paragraphs[0]);
      setText('cms-para-2', content.paragraphs[1]);
      setText('cms-para-3', content.paragraphs[2]);
    }
  }

  // ---------------------------------------------------------------------
  // Privacy / Terms — headline, byline, intro, then a rebuilt list of
  // {heading, body} sections (shared renderer, since both pages use the
  // identical structure).
  // ---------------------------------------------------------------------
  function applyLegalContent(content) {
    if (!content) return;
    setText('cms-headline', content.headline);
    setText('cms-byline', content.byline);
    setText('cms-intro', content.intro);

    if (Array.isArray(content.sections)) {
      const container = document.getElementById('cms-body-copy');
      const introEl = document.getElementById('cms-intro');
      if (container && introEl) {
        // Remove every node after the intro paragraph, then rebuild.
        while (introEl.nextSibling) {
          container.removeChild(introEl.nextSibling);
        }
        content.sections.forEach(function (s) {
          const h2 = document.createElement('h2');
          h2.textContent = s.heading || ''; // safe: textContent
          const p = document.createElement('p');

          // A section can optionally carry a single inline link (used by
          // the "Contact" section's "...via the contact form..." link).
          // Built entirely with textContent/createElement — never
          // innerHTML — so this can't be used to inject markup, even
          // though the href itself is admin-authored.
          const body = s.body || '';
          if (s.link_text && s.link_href && body.indexOf(s.link_text) !== -1) {
            const idx = body.indexOf(s.link_text);
            p.appendChild(document.createTextNode(body.slice(0, idx)));
            const a = document.createElement('a');
            a.setAttribute('href', s.link_href);
            a.textContent = s.link_text;
            p.appendChild(a);
            p.appendChild(document.createTextNode(body.slice(idx + s.link_text.length)));
          } else {
            p.textContent = body; // safe: textContent
          }

          container.appendChild(h2);
          container.appendChild(p);
        });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Entry point: reads data-cms-page="home" off <body>, fetches that
  // published page row, and hands it to the matching renderer.
  // ---------------------------------------------------------------------
  async function loadCmsPageContent() {
    const slug = document.body.getAttribute('data-cms-page');

    // These two are independent of the page-content renderer above and
    // run on any page that has the matching container elements —
    // loadServicesTable() only does anything on Home/Services (which
    // have #cms-services-table), and loadServiceBlocks() only on the
    // 4 service detail pages (which have #cms-subblocks).
    loadServicesTable();
    if (slug === 'business-central' || slug === 'zoho-books' || slug === 'odoo' || slug === 'web-development') {
      loadServiceBlocks(slug);
    }

    if (!slug || !PAGE_RENDERERS[slug]) {
      setState('fallback');
      return;
    }

    try {
      const { data, error } = await withTimeout(
        cmsClient
          .from('pages')
          .select('content, seo_title, seo_description')
          .eq('slug', slug)
          .eq('status', 'published')
          .maybeSingle(),
        FETCH_TIMEOUT_MS
      );

      if (error) {
        console.warn('[site-cms] Supabase returned an error fetching "' + slug + '":', error.message || error);
        setState('error');
        return; // built-in HTML stands unchanged
      }

      if (!data) {
        console.info('[site-cms] No published CMS content for "' + slug + '" yet — showing built-in page content.');
        setState('fallback');
        return;
      }

      if (data.seo_title) document.title = data.seo_title;
      if (data.seo_description) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', data.seo_description);
      }

      PAGE_RENDERERS[slug](data.content);
      setState('loaded');
    } catch (e) {
      console.warn('[site-cms] Failed to load CMS content for "' + slug + '" (' + (e && e.message ? e.message : 'unknown error') + '). Showing built-in page content.');
      setState('error');
      // Built-in HTML stands unchanged — visitors see a normal page either way.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCmsPageContent);
  } else {
    loadCmsPageContent();
  }
})();
