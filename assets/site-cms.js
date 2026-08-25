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
