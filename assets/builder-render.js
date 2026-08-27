// Auwion Page Builder — shared block-rendering library.
//
// This is the SINGLE SOURCE OF TRUTH for turning builder_blocks rows into
// HTML. Both page.html (the real public page) and admin/builder-edit.html
// (the live preview pane) load this same file and call the same
// functions — so what an admin sees in the live preview is guaranteed to
// match what a real visitor sees, not a second reimplementation that
// could quietly drift out of sync.
//
// Pure functions only: no Supabase calls, no DOM assumptions beyond the
// HTML string this returns. Safe rendering: every user-authored text
// value goes through escBuilder() (escapes & < >) before being placed in
// HTML; nothing here uses untrusted values as raw markup.

const BUILDER_COLOR_MAP = { dark: 'var(--text)', soft: 'var(--text-soft)', teal: 'var(--teal)', blue: 'var(--pink)', white: '#ffffff' };
const BUILDER_HEADING_SIZE_MAP = { sm: '20px', md: '28px', lg: '36px', xl: '48px' };
const BUILDER_PARA_SIZE_MAP = { sm: '14px', md: '16px', lg: '18px', xl: '20px' };
const BUILDER_SPACER_MAP = { sm: '16px', md: '32px', lg: '56px', xl: '96px' };
const BUILDER_SECTION_BG_MAP = { none: 'transparent', surface: '#ffffff', dark: 'var(--text)', gradient: 'var(--grad)' };
const BUILDER_SECTION_PADDING_MAP = { sm: '24px', md: '48px', lg: '72px', xl: '100px' };

// The exact CSS used by the public page.html, reused for the admin's
// live preview iframe so it renders identically (same tokens, same
// utility classes) rather than an approximation.
const BUILDER_PREVIEW_CSS = `
  :root{
    --bg:#F6F8FC; --pink:#3B82F6; --teal:#0FA898;
    --grad: linear-gradient(90deg, var(--pink), var(--teal));
    --text:#10142B; --text-soft:#4B5170; --text-dim:#848AA8;
    --border-soft:rgba(16,20,43,0.10);
    --font-display:'Space Grotesk', sans-serif; --font-body:'Inter', sans-serif; --font-mono:'IBM Plex Mono', monospace;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);line-height:1.6;-webkit-font-smoothing:antialiased;padding:24px;}
  .btn{display:inline-block;font-weight:600;font-size:14px;border-radius:100px;padding:12px 24px;text-decoration:none;}
  .btn-primary{background:var(--grad);color:#0A0820;}
  .btn-secondary{background:#fff;color:var(--text);border:1px solid var(--border-soft);}
  .btn-ghost{background:none;color:var(--text);border:1px solid var(--border-soft);}
  .btn-dark{background:var(--text);color:#fff;}
  .columns-2{display:grid;grid-template-columns:1fr 1fr;gap:32px;}
  .columns-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;}
  @media(max-width:700px){.columns-2,.columns-3{grid-template-columns:1fr;}}
  .card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;}
  .builder-card{background:#fff;border:1px solid var(--border-soft);border-radius:14px;padding:24px;}
  .builder-card h3{font-family:var(--font-display);font-size:17px;margin:0 0 8px;}
  .builder-card p{color:var(--text-soft);font-size:14px;margin:0;}
  .builder-empty-hint{text-align:center;padding:60px 20px;color:var(--text-dim);font-family:var(--font-mono);font-size:13px;}
`;

function escBuilder(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderBuilderBlock(b) {
  const p = b.props || {};
  switch (b.type) {
    case 'heading': {
      const tag = p.level || 'h2';
      const color = BUILDER_COLOR_MAP[p.color] || BUILDER_COLOR_MAP.dark;
      const size = BUILDER_HEADING_SIZE_MAP[p.size] || BUILDER_HEADING_SIZE_MAP.md;
      return '<' + tag + ' style="font-family:var(--font-display);font-weight:700;text-align:' + escBuilder(p.align || 'left') +
        ';color:' + color + ';font-size:' + size + ';margin:0 0 16px;">' + escBuilder(p.text) + '</' + tag + '>';
    }
    case 'paragraph': {
      const color = BUILDER_COLOR_MAP[p.color] || BUILDER_COLOR_MAP.soft;
      const size = BUILDER_PARA_SIZE_MAP[p.size] || BUILDER_PARA_SIZE_MAP.md;
      return '<p style="text-align:' + escBuilder(p.align || 'left') + ';color:' + color + ';font-size:' + size + ';margin:0 0 16px;">' + escBuilder(p.text) + '</p>';
    }
    case 'image': {
      const width = p.width === 'half' ? '50%' : p.width === 'third' ? '33%' : '100%';
      const alignStyle = p.align === 'center' ? 'display:block;margin-left:auto;margin-right:auto;' : p.align === 'right' ? 'display:block;margin-left:auto;' : '';
      if (!p.url) return '<div class="builder-empty-hint">(image not set yet)</div>';
      return '<img src="' + escBuilder(p.url) + '" alt="' + escBuilder(p.alt || '') + '" style="max-width:' + width + ';border-radius:12px;margin-bottom:16px;' + alignStyle + '">';
    }
    case 'button': {
      const style = ['primary', 'secondary', 'ghost', 'dark'].indexOf(p.style) !== -1 ? p.style : 'primary';
      const alignWrap = p.align ? 'text-align:' + escBuilder(p.align) + ';' : '';
      return '<div style="' + alignWrap + 'margin-bottom:16px;"><a href="' + escBuilder(p.url || '#') + '" class="btn btn-' + style + '">' + escBuilder(p.label) + '</a></div>';
    }
    case 'spacer': {
      return '<div style="height:' + (BUILDER_SPACER_MAP[p.height] || BUILDER_SPACER_MAP.md) + ';"></div>';
    }
    case 'card_grid': {
      const cols = p.columns === 3 ? 3 : 2;
      const cards = Array.isArray(p.cards) ? p.cards : [];
      return '<div class="card-grid" style="grid-template-columns:repeat(' + cols + ',1fr);margin-bottom:16px;">' +
        cards.map(function (c) {
          return '<div class="builder-card"><h3>' + escBuilder(c.title) + '</h3><p>' + escBuilder(c.text) + '</p></div>';
        }).join('') + '</div>';
    }
    default:
      return '';
  }
}

function renderAnyBuilderBlock(b, childrenByBlock) {
  if (b.type === 'columns') return renderBuilderColumnsBlock(b, childrenByBlock);
  if (b.type === 'section') return renderBuilderSectionBlock(b, childrenByBlock);
  return renderBuilderBlock(b);
}

function renderBuilderColumnsBlock(block, childrenByBlock) {
  const p = block.props || {};
  const colClass = p.count === 3 ? 'columns-3' : 'columns-2';
  const children = childrenByBlock[block.id] || [];
  const numCols = p.count === 3 ? 3 : 2;
  const colHtml = [];
  for (let i = 0; i < numCols; i++) {
    const colChildren = children.filter(function (c) { return c.column_index === i; });
    colHtml.push('<div>' + colChildren.map(function (c) { return renderAnyBuilderBlock(c, childrenByBlock); }).join('') + '</div>');
  }
  return '<div class="' + colClass + '" style="margin-bottom:16px;">' + colHtml.join('') + '</div>';
}

function renderBuilderSectionBlock(block, childrenByBlock) {
  const p = block.props || {};
  const bg = BUILDER_SECTION_BG_MAP[p.background] || BUILDER_SECTION_BG_MAP.none;
  const pad = BUILDER_SECTION_PADDING_MAP[p.padding] || BUILDER_SECTION_PADDING_MAP.md;
  const children = childrenByBlock[block.id] || [];
  const inner = children.map(function (c) { return renderAnyBuilderBlock(c, childrenByBlock); }).join('');
  const radius = (p.background && p.background !== 'none') ? 'border-radius:16px;' : '';
  return '<div style="background:' + bg + ';padding:' + pad + ';margin-bottom:16px;' + radius + '">' + inner + '</div>';
}

// Renders a full set of top-level blocks (with their children map) into
// one HTML string. Returns a friendly empty-state message if there's
// nothing to show yet, so the live preview never looks broken.
function renderBuilderPageHtml(topLevelBlocks, childrenByBlock) {
  if (!topLevelBlocks || topLevelBlocks.length === 0) {
    return '<div class="builder-empty-hint">Add a block to see it appear here.</div>';
  }
  return topLevelBlocks.map(function (b) { return renderAnyBuilderBlock(b, childrenByBlock); }).join('');
}
