// MERIDIANO — shared interactions

// Suppress benign ResizeObserver browser noise (Chrome quirk, not a real bug)
(function suppressROW() {
  const ignore = (msg) => typeof msg === 'string' && msg.includes('ResizeObserver loop');
  window.addEventListener('error', (e) => {
    if (ignore(e.message)) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  const origError = console.error;
  console.error = function (...args) {
    if (args.length && ignore(args[0])) return;
    return origError.apply(console, args);
  };
  // Patch ResizeObserver to swallow the loop notification itself
  if (typeof ResizeObserver !== 'undefined') {
    const RO = ResizeObserver;
    window.ResizeObserver = class extends RO {
      constructor(cb) {
        super((entries, observer) => {
          requestAnimationFrame(() => {
            try { cb(entries, observer); } catch (e) {}
          });
        });
      }
    };
  }
})();

(function () {
  // ---- Sticky header tint on scroll
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- Reveal on scroll
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  // ---- FAQ (uses <details> behavior; we just toggle class for animation)
  document.querySelectorAll('.faq-row').forEach((row) => {
    const trigger = row.querySelector('.faq-trigger');
    const body = row.querySelector('.faq-body');
    if (!trigger || !body) return;

    // Hide initially unless open
    body.style.maxHeight = row.open ? body.scrollHeight + 'px' : '0px';
    body.style.overflow = 'hidden';
    body.style.transition = 'max-height 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease';
    body.style.opacity = row.open ? '1' : '0';

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const wasOpen = row.hasAttribute('open');
      if (wasOpen) {
        body.style.maxHeight = body.scrollHeight + 'px';
        requestAnimationFrame(() => {
          body.style.maxHeight = '0px';
          body.style.opacity = '0';
        });
        setTimeout(() => row.removeAttribute('open'), 500);
      } else {
        row.setAttribute('open', '');
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity = '1';
        body.addEventListener(
          'transitionend',
          () => {
            if (row.hasAttribute('open')) body.style.maxHeight = 'none';
          },
          { once: true }
        );
      }
    });
  });

  // ---- Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('is-open');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        menu.classList.remove('is-open');
        document.body.style.overflow = '';
      })
    );
  }

  // ---- Cookie bar
  const bar = document.querySelector('.cookie-bar');
  if (bar) {
    try {
      if (localStorage.getItem('meridiano:cookies') === 'ok') {
        bar.classList.add('is-hidden');
      } else {
        setTimeout(() => bar.classList.add('is-visible'), 600);
      }
    } catch (e) {}
    bar.querySelectorAll('[data-cookie]').forEach((b) =>
      b.addEventListener('click', () => {
        try { localStorage.setItem('meridiano:cookies', 'ok'); } catch (e) {}
        bar.classList.add('is-hidden');
      })
    );
  }

  // ---- Form mock
  const form = document.querySelector('[data-lead-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (!data.get('privacy')) {
        const err = form.querySelector('[data-form-error]');
        if (err) {
          err.textContent = 'Devi accettare la Privacy Policy per inviare la richiesta.';
          err.style.display = 'block';
        }
        return;
      }
      const fs = form.querySelector('[data-form-stage]');
      if (fs) fs.dataset.stage = 'success';
    });
  }

  // ---- Parallax for hero images (light)
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length) {
    const onPar = () => {
      const y = window.scrollY;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || '0.15');
        el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
      });
    };
    window.addEventListener('scroll', onPar, { passive: true });
    onPar();
  }

  // =============================================================
  //   TWEAKS PANEL — typography swap
  // =============================================================
  const FONTS = {
    'geist':         { label: 'Geist',              stack: "'Geist', 'Inter', system-ui, sans-serif",      note: 'modern · default' },
    'schibsted':     { label: 'Schibsted Grotesk',  stack: "'Schibsted Grotesk', system-ui, sans-serif",   note: 'editorial · sans' },
    'onest':         { label: 'Onest',              stack: "'Onest', 'Inter', system-ui, sans-serif",      note: 'soft · friendly' },
    'manrope':       { label: 'Manrope',            stack: "'Manrope', system-ui, sans-serif",             note: 'clean · neutral' },
    'space-grotesk': { label: 'Space Grotesk',      stack: "'Space Grotesk', system-ui, sans-serif",       note: 'tech · confident' },
    'dm-sans':       { label: 'DM Sans',            stack: "'DM Sans', system-ui, sans-serif",             note: 'utilitarian · refined' },
    'instrument':    { label: 'Instrument Serif',   stack: "'Instrument Serif', Georgia, serif",           note: 'luxe · serif' },
    'newsreader':    { label: 'Newsreader',         stack: "'Newsreader', Georgia, serif",                 note: 'editorial · serif' },
  };
  const TYPE_SCALE = {
    'tight':   { label: 'Tight',     value: '-0.04em' },
    'normal':  { label: 'Standard',  value: '-0.025em' },
    'open':    { label: 'Open',      value: '-0.01em' },
  };

  const PERSIST_KEY = 'meridiano:tweaks:v2';
  const defaults = { font: 'geist', tracking: 'tight' };
  let state;
  try {
    state = Object.assign({}, defaults, JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}'));
    // Belt and suspenders: if the saved font isn't in our current FONTS map, fall back to default.
    if (!FONTS[state.font]) state.font = defaults.font;
  } catch (e) { state = { ...defaults }; }

  // Clear v1 key (migration cleanup)
  try { localStorage.removeItem('meridiano:tweaks'); } catch (e) {}

  // Apply on load
  const apply = () => {
    document.documentElement.style.setProperty('--font-display', FONTS[state.font]?.stack || FONTS.newsreader.stack);
    document.documentElement.style.setProperty('--display-tracking', TYPE_SCALE[state.tracking]?.value || TYPE_SCALE.tight.value);
  };
  apply();

  const persist = () => {
    try { localStorage.setItem(PERSIST_KEY, JSON.stringify(state)); } catch (e) {}
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: state }, '*');
    } catch (e) {}
  };

  // Build panel lazily
  let panel = null;
  const buildPanel = () => {
    if (panel) return panel;
    panel = document.createElement('aside');
    panel.className = 'tweaks-panel';
    panel.setAttribute('aria-label', 'Tweaks');
    panel.innerHTML = `
      <header class="tp-head">
        <div>
          <div class="tp-eyebrow">Tweaks</div>
          <h3 class="tp-title">Type<span class="tp-it"> &amp; </span>treatment</h3>
        </div>
        <button class="tp-close" aria-label="Close tweaks">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
        </button>
      </header>

      <section class="tp-section">
        <div class="tp-label">Display font</div>
        <div class="tp-fonts">
          ${Object.entries(FONTS).map(([key, f]) => `
            <button class="tp-font" data-font="${key}" style="font-family: ${f.stack};">
              <span class="tp-font-name">${f.label}</span>
              <span class="tp-font-note">${f.note}</span>
              <span class="tp-font-preview">Aa <em>Florida</em></span>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="tp-section">
        <div class="tp-label">Headline tracking</div>
        <div class="tp-segmented">
          ${Object.entries(TYPE_SCALE).map(([key, t]) => `
            <button class="tp-seg" data-tracking="${key}">${t.label}</button>
          `).join('')}
        </div>
      </section>

      <footer class="tp-foot">
        <div class="tp-hint">Choices persist on this device.</div>
        <button class="tp-reset">Reset</button>
      </footer>
    `;
    document.body.appendChild(panel);

    const refresh = () => {
      panel.querySelectorAll('.tp-font').forEach(b => b.classList.toggle('is-active', b.dataset.font === state.font));
      panel.querySelectorAll('.tp-seg').forEach(b => b.classList.toggle('is-active', b.dataset.tracking === state.tracking));
    };
    refresh();

    panel.querySelectorAll('.tp-font').forEach((b) => {
      b.addEventListener('click', () => {
        state.font = b.dataset.font;
        apply(); refresh(); persist();
      });
    });
    panel.querySelectorAll('.tp-seg').forEach((b) => {
      b.addEventListener('click', () => {
        state.tracking = b.dataset.tracking;
        apply(); refresh(); persist();
      });
    });
    panel.querySelector('.tp-reset').addEventListener('click', () => {
      Object.assign(state, defaults);
      apply(); refresh(); persist();
    });
    panel.querySelector('.tp-close').addEventListener('click', () => {
      panel.classList.remove('is-open');
      try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
    });

    return panel;
  };

  // Listen FIRST, then announce availability
  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === '__activate_edit_mode') {
      buildPanel().classList.add('is-open');
    } else if (d.type === '__deactivate_edit_mode') {
      if (panel) panel.classList.remove('is-open');
    }
  });

  try {
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
  } catch (e) {}
})();
