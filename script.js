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

  // ---- Demo login for private prototype
  const loginForm = document.querySelector('[data-demo-login]');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(loginForm);
      const username = String(data.get('username') || '').trim();
      const password = String(data.get('password') || '');
      const error = loginForm.querySelector('[data-login-error]');
      const params = new URLSearchParams(window.location.search);
      const requestedNext = params.get('next') || 'corrispondenza-cliente.html';
      const allowedNext = ['admin.html', 'corrispondenza-cliente.html'];
      const next = allowedNext.includes(requestedNext) ? requestedNext : 'corrispondenza-cliente.html';
      const showError = (message) => {
        if (error) {
          error.textContent = message;
          error.classList.add('is-visible');
        }
      };
      const fallbackLogin = () => {
        if (username === 'admin' && password === 'admin') {
          try { sessionStorage.setItem('meridiano:demo-auth', 'ok'); } catch (err) {}
          window.location.href = next === 'admin.html' ? 'admin.html' : 'admin.html';
          return;
        }
        if (username === 'cliente' && password === 'cliente') {
          try { sessionStorage.setItem('meridiano:demo-auth', 'ok'); } catch (err) {}
          window.location.href = 'corrispondenza-cliente.html';
          return;
        }
        showError('Credenziali non valide. Usa admin/admin o cliente/cliente per la demo.');
      };

      if (window.location.protocol === 'file:') {
        fallbackLogin();
        return;
      }

      fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
        .then((res) => {
          if (res.ok) {
            return res.json().then((body) => {
              try { sessionStorage.setItem('meridiano:demo-auth', 'ok'); } catch (err) {}
              const target = allowedNext.includes(next) && (
                (body.user?.role === 'admin' && next === 'admin.html') ||
                (body.user?.role === 'client' && next === 'corrispondenza-cliente.html')
              ) ? next : body.next;
              window.location.href = target || (body.user?.role === 'admin' ? 'admin.html' : 'corrispondenza-cliente.html');
              return null;
            });
          }
          if (res.status === 404 || res.status === 405) {
            fallbackLogin();
            return null;
          }
          return res.json().catch(() => ({ error: 'Credenziali non valide.' }));
        })
        .then((body) => {
          if (body) showError(body.error || 'Credenziali non valide.');
        })
        .catch(() => {
          fallbackLogin();
        });
    });
  }

  document.querySelectorAll('[data-demo-logout]').forEach((link) => {
    link.addEventListener('click', (e) => {
      try { sessionStorage.removeItem('meridiano:demo-auth'); } catch (err) {}
      if (window.location.protocol === 'file:') return;
      e.preventDefault();
      fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
        .finally(() => {
          window.location.href = 'login.html';
        });
    });
  });

  // ---- Protected mailroom interactions
  const mailApp = document.querySelector('.mail-app');
  if (mailApp) {
    const fallbackMail = [
      {
        id: 'DOC-2026-0604-014',
        initials: 'FL',
        sender: 'Florida Department of State',
        subject: 'Annual Report reminder',
        summary: 'Annual Report reminder per Italia Group LLC. Scadenza operativa: 1 maggio.',
        receivedAt: '2026-06-04T09:42:00+02:00',
        status: 'urgent',
        documentType: 'Avviso statale',
        confidenceScore: 98,
        detailTitle: 'Annual Report reminder',
        previewTitle: 'Annual Report Notice',
        previewBody: 'Italia Group LLC\nMiami, FL',
        assignmentReason: 'Documento assegnato a Italia Group LLC tramite corrispondenza esatta su ragione sociale, indirizzo registered agent e storico annual report.',
        control: 'Automatico, alta confidenza',
      },
      {
        id: 'DOC-2026-0603-009',
        initials: 'IRS',
        sender: 'Internal Revenue Service',
        subject: 'Conferma ricezione comunicazione fiscale federale',
        summary: "Conferma ricezione comunicazione fiscale federale collegata all'EIN aziendale.",
        receivedAt: '2026-06-03T16:15:00+02:00',
        status: 'new',
        documentType: 'IRS / fiscale',
        confidenceScore: 96,
        detailTitle: 'Conferma IRS',
        previewTitle: 'IRS Notice',
        previewBody: 'Italia Group LLC\nFederal tax correspondence',
        assignmentReason: 'Documento assegnato tramite corrispondenza tra EIN aziendale, ragione sociale e storico fiscale del cliente.',
        control: 'Automatico, alta confidenza',
      },
      {
        id: 'DOC-2026-0531-021',
        initials: 'BK',
        sender: 'Relay Financial',
        subject: 'Comunicazione bancaria ordinaria',
        summary: 'Comunicazione bancaria ordinaria per il conto business.',
        receivedAt: '2026-05-31T11:08:00+02:00',
        status: 'new',
        documentType: 'Banca',
        confidenceScore: null,
        detailTitle: 'Comunicazione bancaria',
        previewTitle: 'Relay Financial',
        previewBody: 'Italia Group LLC\nBusiness account notice',
        assignmentReason: 'Documento pubblicato dopo revisione manuale amministratore per confermare intestazione e riferimenti conto.',
        control: 'Approvata da admin',
      },
      {
        id: 'DOC-2026-0518-006',
        initials: 'RA',
        sender: 'Registered Agent Office',
        subject: 'Nota interna di scansione',
        summary: 'Nota interna di conferma scansione e archiviazione documento societario.',
        receivedAt: '2026-05-18T10:30:00+02:00',
        status: 'read',
        documentType: 'Amministrativo',
        confidenceScore: 100,
        detailTitle: 'Nota di archiviazione',
        previewTitle: 'Scan Confirmation',
        previewBody: 'Italia Group LLC\nDocument archived',
        assignmentReason: 'Documento interno associato direttamente al fascicolo cliente.',
        control: 'Automatico, alta confidenza',
      },
    ];
    const state = {
      items: fallbackMail,
      selectedId: fallbackMail[0].id,
      status: 'all',
      query: '',
      type: 'all',
      period: '30',
      reviewQueueCount: 5,
    };
    const statusLabels = {
      urgent: 'Urgente',
      new: 'Nuova',
      read: 'Letta',
      archived: 'Archiviata',
    };
    const confChip = (score) => {
      const tier = score >= 90 ? 'high' : score >= 70 ? 'med' : 'low';
      return `<span class="mail-conf mail-conf--${tier}">Confidenza ${score}%</span>`;
    };
    const list = document.querySelector('[data-mail-list]');
    const detail = document.querySelector('[data-mail-detail]');
    const search = document.querySelector('[data-mail-search]');
    const type = document.querySelector('[data-mail-type]');
    const period = document.querySelector('[data-mail-period]');
    const reviewNote = document.querySelector('[data-review-note]');
    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const formatDate = (value) => new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
    const selectedItem = () => state.items.find((item) => item.id === state.selectedId) || state.items[0];
    const isWithinPeriod = (item) => {
      if (state.period === 'all') return true;
      const itemDate = new Date(item.receivedAt);
      if (state.period === 'year') return itemDate.getFullYear() === new Date().getFullYear();
      const days = Number(state.period || 30);
      return Date.now() - itemDate.getTime() <= days * 24 * 60 * 60 * 1000;
    };
    const filteredItems = () => state.items.filter((item) => {
      const haystack = `${item.sender} ${item.subject} ${item.summary} ${item.documentType}`.toLowerCase();
      const statusOk = state.status === 'all' || item.status === state.status;
      const queryOk = !state.query || haystack.includes(state.query.toLowerCase());
      const typeOk = state.type === 'all' || item.documentType === state.type;
      return statusOk && queryOk && typeOk && isWithinPeriod(item);
    });
    const renderMetrics = () => {
      const setText = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
      };
      setText('[data-metric-new]', state.items.filter((item) => item.status === 'new').length);
      setText('[data-metric-review]', state.reviewQueueCount);
      setText('[data-metric-urgent]', state.items.filter((item) => item.status === 'urgent').length);
      setText('[data-metric-archived]', state.items.filter((item) => item.status === 'archived' || item.status === 'read').length + 47);
      if (reviewNote) reviewNote.textContent = `${state.reviewQueueCount} casi in revisione admin esclusi da questa vista`;
    };
    const renderList = () => {
      if (!list) return;
      const rows = filteredItems();
      if (!rows.length) {
        list.innerHTML = '<div class="mail-empty">Nessun documento corrisponde ai filtri selezionati.</div>';
        return;
      }
      if (!rows.some((item) => item.id === state.selectedId)) state.selectedId = rows[0].id;
      list.innerHTML = rows.map((item) => `
        <article class="mail-row ${item.id === state.selectedId ? 'is-selected' : ''}" data-mail-id="${escapeHtml(item.id)}" tabindex="0" role="button">
          <div class="mail-icon">${escapeHtml(item.initials || item.sender.slice(0, 2).toUpperCase())}</div>
          <div class="mail-row-main">
            <div class="mail-row-title">
              <h3>${escapeHtml(item.sender)}</h3>
              <span class="mail-status ${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] || item.status)}</span>
            </div>
            <p>${escapeHtml(item.summary)}</p>
            <div class="mail-meta">
              <span>Ricevuta ${formatDate(item.receivedAt)}</span>
              <span>${escapeHtml(item.documentType)}</span>
              ${item.confidenceScore == null ? `<span>${escapeHtml(item.control || 'Approvata da admin')}</span>` : confChip(item.confidenceScore)}
            </div>
          </div>
        </article>
      `).join('');
    };
    const renderDetail = () => {
      const item = selectedItem();
      if (!detail || !item) return;
      detail.dataset.mailId = item.id;
      const previewBody = escapeHtml(item.previewBody || '').replace(/\n/g, '<br/>');
      detail.querySelector('.mail-panel').innerHTML = `
        <div class="mail-detail-head">
          <span class="mail-status ${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] || item.status)}</span>
          <span class="kicker">${escapeHtml(item.id)}</span>
        </div>
        <div class="mail-preview" aria-label="Anteprima documento">
          <div class="mail-paper">
            <span>${escapeHtml(item.sender)}</span>
            <strong>${escapeHtml(item.previewTitle || item.detailTitle || item.subject)}</strong>
            <p>${previewBody}</p>
          </div>
        </div>
        <h2>${escapeHtml(item.detailTitle || item.subject)}</h2>
        <p class="mail-detail-copy">${escapeHtml(item.assignmentReason || item.summary)}</p>
        <dl class="mail-facts">
          <div><dt>Mittente</dt><dd>${escapeHtml(item.sender)}</dd></div>
          <div><dt>Ricezione</dt><dd>${formatDate(item.receivedAt)}</dd></div>
          <div><dt>Stato</dt><dd>Pubblicato</dd></div>
          <div><dt>Controllo</dt><dd>${escapeHtml(item.control || 'Automatico')}</dd></div>
        </dl>
        <div class="mail-detail-actions">
          <button class="btn btn-primary" type="button" data-open-pdf>Apri PDF</button>
          <button class="btn btn-outline" type="button" data-support-request>Chiedi supporto</button>
        </div>
      `;
    };
    const renderMailroom = () => {
      renderMetrics();
      renderList();
      renderDetail();
    };
    const downloadCsvFallback = () => {
      const header = ['id', 'sender', 'subject', 'receivedAt', 'status', 'documentType'];
      const csv = [
        header.join(','),
        ...state.items.map((item) => header.map((key) => `"${String(item[key] ?? '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meridiano-corrispondenza.csv';
      a.click();
      URL.revokeObjectURL(url);
    };
    const postTicket = (endpoint, defaultMessage) => {
      const item = selectedItem();
      if (!item) return;
      const message = window.prompt(defaultMessage, '');
      if (!message) return;
      if (window.location.protocol === 'file:') {
        window.alert('Richiesta registrata nella demo locale.');
        return;
      }
      fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailId: item.id, message }),
      })
        .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
          if (!ok) throw new Error(body.error || 'Operazione non riuscita.');
          window.alert(`Richiesta inviata. Ticket: ${body.ticketId}`);
        })
        .catch((error) => {
          window.alert(error.message || 'Operazione non riuscita.');
        });
    };

    list?.addEventListener('click', (e) => {
      const row = e.target.closest('[data-mail-id]');
      if (!row) return;
      state.selectedId = row.dataset.mailId;
      renderMailroom();
    });
    list?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('[data-mail-id]');
      if (!row) return;
      e.preventDefault();
      state.selectedId = row.dataset.mailId;
      renderMailroom();
    });
    search?.addEventListener('input', () => {
      state.query = search.value.trim();
      renderMailroom();
    });
    type?.addEventListener('change', () => {
      state.type = type.value;
      renderMailroom();
    });
    period?.addEventListener('change', () => {
      state.period = period.value;
      renderMailroom();
    });
    document.querySelectorAll('[data-mail-status]').forEach((button) => {
      button.addEventListener('click', () => {
        state.status = button.dataset.mailStatus;
        document.querySelectorAll('[data-mail-status]').forEach((btn) => btn.classList.toggle('is-active', btn === button));
        renderMailroom();
      });
    });
    document.querySelector('[data-mail-reset]')?.addEventListener('click', () => {
      state.status = 'all';
      state.query = '';
      state.type = 'all';
      state.period = '30';
      if (search) search.value = '';
      if (type) type.value = 'all';
      if (period) period.value = '30';
      document.querySelectorAll('[data-mail-status]').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.mailStatus === 'all'));
      renderMailroom();
    });
    document.querySelector('[data-download-archive]')?.addEventListener('click', () => {
      if (window.location.protocol === 'file:') {
        downloadCsvFallback();
        return;
      }
      window.location.href = '/api/mail/archive.csv';
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-pdf]')) {
        const item = selectedItem();
        if (!item) return;
        if (window.location.protocol === 'file:') {
          window.alert('Avvia il backend con npm start per aprire il PDF protetto.');
          return;
        }
        window.open(`/api/mail/${encodeURIComponent(item.id)}.pdf`, '_blank', 'noopener');
      }
      if (e.target.closest('[data-support-request]')) {
        postTicket('/api/support', 'Descrivi la richiesta di supporto per questo documento:');
      }
      if (e.target.closest('[data-report-issue]')) {
        postTicket('/api/report-issue', 'Descrivi il problema di assegnazione o contenuto:');
      }
    });

    renderMailroom();

    if (window.location.protocol !== 'file:') {
      fetch('/api/mail', { credentials: 'same-origin' })
        .then((res) => {
          if (res.status === 401) {
            window.location.replace('login.html?next=corrispondenza-cliente.html');
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((payload) => {
          if (!payload || !payload.ok) return;
          const company = document.querySelector('.client-company');
          if (company && payload.company) company.textContent = payload.company;
          state.items = payload.items || state.items;
          state.reviewQueueCount = payload.reviewQueueCount ?? state.reviewQueueCount;
          state.selectedId = state.items[0]?.id || state.selectedId;
          renderMailroom();
        })
        .catch(() => {});
    }
  }

  // ---- Admin mailroom
  const adminApp = document.querySelector('.admin-app');
  if (adminApp) {
    const fallbackAdmin = [
      {
        id: 'DOC-2026-0604-014', initials: 'FL', sender: 'Florida Department of State',
        subject: 'Annual Report reminder', summary: 'Annual Report reminder per Italia Group LLC. Scadenza operativa: 1 maggio.',
        receivedAt: '2026-06-04T09:42:00+02:00', documentType: 'Avviso statale', confidenceScore: 98,
        clientId: 'italia-group', publicationStatus: 'published', previewTitle: 'Annual Report Notice',
        previewBody: 'Italia Group LLC\nMiami, FL', detailTitle: 'Annual Report reminder',
        assignmentReason: 'Corrispondenza esatta su ragione sociale, indirizzo registered agent e storico annual report.',
        control: 'Automatico, alta confidenza',
      },
      {
        id: 'DOC-2026-0603-009', initials: 'IRS', sender: 'Internal Revenue Service',
        subject: 'Comunicazione fiscale federale', summary: "Conferma ricezione comunicazione collegata all'EIN aziendale.",
        receivedAt: '2026-06-03T16:15:00+02:00', documentType: 'IRS / fiscale', confidenceScore: 96,
        clientId: 'italia-group', publicationStatus: 'published', previewTitle: 'IRS Notice',
        previewBody: 'Italia Group LLC\nFederal tax correspondence', detailTitle: 'Conferma IRS',
        assignmentReason: 'Corrispondenza tra EIN aziendale, ragione sociale e storico fiscale del cliente.',
        control: 'Automatico, alta confidenza',
      },
      {
        id: 'DOC-2026-0602-031', initials: 'LX', sender: 'Lex & Partners LLP',
        subject: 'Notifica legale', summary: 'Comunicazione legale con ragione sociale simile a due clienti distinti.',
        receivedAt: '2026-06-02T14:05:00+02:00', documentType: 'Legale', confidenceScore: 61,
        clientId: null, publicationStatus: 'needs_review', previewTitle: 'Legal Notice',
        previewBody: 'Italia Holding LLC?\nService of process', detailTitle: 'Notifica legale da verificare',
        assignmentReason: 'Nome simile a più clienti ("Italia Group" vs "Italia Holding"): confidenza bassa, richiede scelta manuale.',
        control: 'Da verificare',
      },
      {
        id: 'DOC-2026-0531-021', initials: 'BK', sender: 'Relay Financial',
        subject: 'Comunicazione bancaria', summary: 'Comunicazione bancaria ordinaria per il conto business.',
        receivedAt: '2026-05-31T11:08:00+02:00', documentType: 'Banca', confidenceScore: 74,
        clientId: 'sunbelt-trade', publicationStatus: 'needs_review', previewTitle: 'Relay Financial',
        previewBody: 'Sunbelt Trade LLC\nBusiness account notice', detailTitle: 'Comunicazione bancaria',
        assignmentReason: 'Indirizzo coincidente ma intestazione parzialmente illeggibile: conferma consigliata.',
        control: 'Da verificare',
      },
      {
        id: 'DOC-2026-0528-017', initials: '??', sender: 'Mittente non riconosciuto',
        subject: 'Busta senza intestazione leggibile', summary: 'OCR non ha estratto un destinatario affidabile.',
        receivedAt: '2026-05-28T08:50:00+02:00', documentType: 'Amministrativo', confidenceScore: 32,
        clientId: null, publicationStatus: 'needs_review', previewTitle: 'Documento non identificato',
        previewBody: 'Intestazione illeggibile\nScansione a bassa qualità', detailTitle: 'Documento da identificare',
        assignmentReason: 'Confidenza OCR molto bassa: nessun cliente associato in automatico.',
        control: 'Da verificare',
      },
    ];
    const fallbackClients = [
      { id: 'italia-group', company: 'Italia Group LLC' },
      { id: 'sunbelt-trade', company: 'Sunbelt Trade LLC' },
      { id: 'adriatic-labs', company: 'Adriatic Labs LLC' },
    ];
    const adminState = {
      items: fallbackAdmin,
      clients: fallbackClients,
      selectedId: fallbackAdmin[0].id,
      filter: 'all',
    };
    const adminList = document.querySelector('[data-admin-list]');
    const adminDetail = document.querySelector('[data-admin-detail]');
    const statusLabel = (status) => ({
      published: 'Pubblicato',
      needs_review: 'Da verificare',
    }[status] || status);
    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const formatDate = (value) => new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
    const clientName = (clientId) => adminState.clients.find((client) => client.id === clientId)?.company || 'Non assegnata';
    const confChip = (score) => {
      const tier = score >= 90 ? 'high' : score >= 70 ? 'med' : 'low';
      return `<span class="mail-conf mail-conf--${tier}">Confidenza ${score}%</span>`;
    };
    const selectedAdminItem = () => adminState.items.find((item) => item.id === adminState.selectedId) || adminState.items[0];
    const visibleAdminItems = () => adminState.items.filter((item) => adminState.filter === 'all' || item.publicationStatus === adminState.filter);
    const setAdminMetric = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = value;
    };
    const renderAdminMetrics = () => {
      setAdminMetric('[data-admin-total]', adminState.items.length);
      setAdminMetric('[data-admin-review]', adminState.items.filter((item) => item.publicationStatus === 'needs_review').length);
      setAdminMetric('[data-admin-unassigned]', adminState.items.filter((item) => !item.clientId).length);
      setAdminMetric('[data-admin-published]', adminState.items.filter((item) => item.publicationStatus === 'published').length);
    };
    const renderAdminList = () => {
      if (!adminList) return;
      const rows = visibleAdminItems();
      if (!rows.length) {
        adminList.innerHTML = '<div class="mail-empty">Nessun documento in questa vista.</div>';
        return;
      }
      if (!rows.some((item) => item.id === adminState.selectedId)) adminState.selectedId = rows[0].id;
      adminList.innerHTML = rows.map((item) => `
        <article class="mail-row ${item.id === adminState.selectedId ? 'is-selected' : ''}" data-admin-mail-id="${escapeHtml(item.id)}" tabindex="0" role="button">
          <div class="mail-icon">${escapeHtml(item.initials || item.sender.slice(0, 2).toUpperCase())}</div>
          <div class="mail-row-main">
            <div class="mail-row-title">
              <h3>${escapeHtml(item.sender)}</h3>
              <span class="mail-status ${item.publicationStatus === 'needs_review' ? 'review' : 'read'}">${escapeHtml(statusLabel(item.publicationStatus))}</span>
            </div>
            <p>${escapeHtml(item.summary)}</p>
            <div class="mail-meta">
              <span>${formatDate(item.receivedAt)}</span>
              <span>${escapeHtml(item.documentType)}</span>
              <span>${escapeHtml(clientName(item.clientId))}</span>
              ${item.confidenceScore == null ? '<span>Manuale</span>' : confChip(item.confidenceScore)}
            </div>
          </div>
        </article>
      `).join('');
    };
    const renderAdminDetail = () => {
      const item = selectedAdminItem();
      if (!adminDetail || !item) return;
      const options = [
        '<option value="">Seleziona cliente...</option>',
        ...adminState.clients.map((client) => `<option value="${escapeHtml(client.id)}" ${client.id === item.clientId ? 'selected' : ''}>${escapeHtml(client.company)}</option>`),
      ].join('');
      adminDetail.innerHTML = `
        <div class="mail-panel">
          <div class="mail-detail-head">
            <span class="mail-status ${item.publicationStatus === 'needs_review' ? 'review' : 'read'}">${escapeHtml(statusLabel(item.publicationStatus))}</span>
            <span class="kicker">${escapeHtml(item.id)}</span>
          </div>
          <div class="mail-preview" aria-label="Anteprima documento">
            <div class="mail-paper">
              <span>${escapeHtml(item.sender)}</span>
              <strong>${escapeHtml(item.previewTitle || item.detailTitle || item.subject)}</strong>
              <p>${escapeHtml(item.previewBody || '').replace(/\n/g, '<br/>')}</p>
            </div>
          </div>
          <h2>${escapeHtml(item.detailTitle || item.subject)}</h2>
          <p class="mail-detail-copy">${escapeHtml(item.assignmentReason || item.summary)}</p>
          <dl class="mail-facts">
            <div><dt>Cliente</dt><dd>${escapeHtml(clientName(item.clientId))}</dd></div>
            <div><dt>Ricezione</dt><dd>${formatDate(item.receivedAt)}</dd></div>
            <div><dt>Pubblicazione</dt><dd>${escapeHtml(statusLabel(item.publicationStatus))}</dd></div>
            <div><dt>Controllo</dt><dd>${escapeHtml(item.control || 'Da verificare')}</dd></div>
          </dl>
          <label class="mail-field admin-client-select">
            <span>Assegna a cliente</span>
            <select data-admin-client-select>${options}</select>
          </label>
          <div class="mail-detail-actions">
            <button class="btn btn-outline" type="button" data-admin-assign>Assegna</button>
            <button class="btn btn-primary" type="button" data-admin-assign-publish>Assegna e pubblica</button>
            <button class="btn btn-outline" type="button" data-admin-publish ${item.clientId ? '' : 'disabled'}>Pubblica</button>
            <button class="btn btn-outline" type="button" data-admin-open-pdf>Apri PDF</button>
          </div>
        </div>
      `;
    };
    const renderAdmin = () => {
      renderAdminMetrics();
      renderAdminList();
      renderAdminDetail();
    };
    const loadAdmin = () => {
      if (window.location.protocol === 'file:') { renderAdmin(); return; }
      fetch('/api/admin/mail', { credentials: 'same-origin' })
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            window.location.replace('login.html?next=admin.html');
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((payload) => {
          if (!payload || !payload.ok) return;
          adminState.items = payload.items || [];
          adminState.clients = payload.clients || [];
          adminState.selectedId = adminState.selectedId || adminState.items[0]?.id || null;
          renderAdmin();
        })
        .catch(() => {});
    };
    const postAdminAction = (endpoint, body) => fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((res) => res.json().then((payload) => {
      if (!res.ok) throw new Error(payload.error || 'Operazione non riuscita.');
      return payload;
    }));

    adminList?.addEventListener('click', (e) => {
      const row = e.target.closest('[data-admin-mail-id]');
      if (!row) return;
      adminState.selectedId = row.dataset.adminMailId;
      renderAdmin();
    });
    document.querySelectorAll('[data-admin-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        adminState.filter = button.dataset.adminFilter;
        document.querySelectorAll('[data-admin-filter]').forEach((btn) => btn.classList.toggle('is-active', btn === button));
        renderAdmin();
      });
    });
    document.querySelector('[data-admin-refresh]')?.addEventListener('click', loadAdmin);
    document.addEventListener('click', (e) => {
      const item = selectedAdminItem();
      if (!adminApp.contains(e.target) || !item) return;
      const clientId = document.querySelector('[data-admin-client-select]')?.value;
      if (e.target.closest('[data-admin-assign]')) {
        if (!clientId) { window.alert('Seleziona un cliente.'); return; }
        postAdminAction('/api/admin/mail/assign', { mailId: item.id, clientId, publish: false })
          .then(loadAdmin)
          .catch((error) => window.alert(error.message));
      }
      if (e.target.closest('[data-admin-assign-publish]')) {
        if (!clientId) { window.alert('Seleziona un cliente.'); return; }
        postAdminAction('/api/admin/mail/assign', { mailId: item.id, clientId, publish: true })
          .then(loadAdmin)
          .catch((error) => window.alert(error.message));
      }
      if (e.target.closest('[data-admin-publish]')) {
        postAdminAction('/api/admin/mail/publish', { mailId: item.id })
          .then(loadAdmin)
          .catch((error) => window.alert(error.message));
      }
      if (e.target.closest('[data-admin-open-pdf]')) {
        window.open(`/api/mail/${encodeURIComponent(item.id)}.pdf`, '_blank', 'noopener');
      }
    });
    loadAdmin();
    renderAdmin();
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

  // ---- Guide TOC scroll-spy + smooth scroll
  const tocLinks = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
  if (tocLinks.length) {
    const targets = tocLinks
      .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);

    tocLinks.forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        const el = document.getElementById(id);
        if (el) {
          e.preventDefault();
          const y = el.getBoundingClientRect().top + window.scrollY - 88;
          window.scrollTo({ top: y, behavior: 'smooth' });
          history.replaceState(null, '', '#' + id);
        }
      });
    });

    const spy = () => {
      const pos = window.scrollY + 120;
      let active = targets[0];
      for (const t of targets) {
        if (t.offsetTop <= pos) active = t;
      }
      tocLinks.forEach((a) =>
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + (active && active.id))
      );
    };
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  // =============================================================
  //   TWEAKS PANEL — typography swap
  // =============================================================
  const FONTS = {
    'hanken':        { label: 'Hanken Grotesk',     stack: "'Hanken Grotesk', 'Inter', system-ui, sans-serif", note: 'professional · default' },
    'jakarta':       { label: 'Plus Jakarta Sans',  stack: "'Plus Jakarta Sans', system-ui, sans-serif",       note: 'corporate · trusted' },
    'sora':          { label: 'Sora',               stack: "'Sora', system-ui, sans-serif",                    note: 'geometric · sharp' },
    'geist':         { label: 'Geist',              stack: "'Geist', 'Inter', system-ui, sans-serif",          note: 'neutral · clean' },
    'space-grotesk': { label: 'Space Grotesk',      stack: "'Space Grotesk', system-ui, sans-serif",           note: 'tech · confident' },
    'manrope':       { label: 'Manrope',            stack: "'Manrope', system-ui, sans-serif",                 note: 'soft · modern' },
  };
  const ACCENTS = {
    'blue':    { label: 'Blue',   clay: '34 98 240',  clayDeep: '26 76 200',  claySoft: '188 211 255', clayWash: '237 243 255' },
    'navy':    { label: 'Navy',   clay: '30 64 140',  clayDeep: '18 44 100',  claySoft: '180 198 235', clayWash: '235 240 250' },
    'azure':   { label: 'Azure',  clay: '14 132 220', clayDeep: '10 104 180', claySoft: '186 224 250', clayWash: '232 245 254' },
    'teal':    { label: 'Teal',   clay: '13 148 160', clayDeep: '10 116 126', claySoft: '180 226 230', clayWash: '232 248 249' },
  };
  const TYPE_SCALE = {
    'tight':   { label: 'Tight',     value: '-0.035em' },
    'normal':  { label: 'Standard',  value: '-0.022em' },
    'open':    { label: 'Open',      value: '-0.01em' },
  };

  const PERSIST_KEY = 'meridiano:tweaks:v3';
  const defaults = { font: 'hanken', tracking: 'tight', accent: 'blue' };
  let state;
  try {
    state = Object.assign({}, defaults, JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}'));
    // Belt and suspenders: if the saved font isn't in our current FONTS map, fall back to default.
    if (!FONTS[state.font]) state.font = defaults.font;
  } catch (e) { state = { ...defaults }; }

  // Clear old keys (migration cleanup)
  try { localStorage.removeItem('meridiano:tweaks'); localStorage.removeItem('meridiano:tweaks:v2'); } catch (e) {}

  // Apply on load
  const apply = () => {
    const root = document.documentElement.style;
    root.setProperty('--font-display', FONTS[state.font]?.stack || FONTS.hanken.stack);
    root.setProperty('--font-accent', FONTS[state.font]?.stack || FONTS.hanken.stack);
    root.setProperty('--display-tracking', TYPE_SCALE[state.tracking]?.value || TYPE_SCALE.tight.value);
    const a = ACCENTS[state.accent] || ACCENTS.blue;
    root.setProperty('--clay', a.clay);
    root.setProperty('--clay-deep', a.clayDeep);
    root.setProperty('--clay-soft', a.claySoft);
    root.setProperty('--clay-wash', a.clayWash);
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
        <div class="tp-label">Accent colour</div>
        <div class="tp-swatches">
          ${Object.entries(ACCENTS).map(([key, a]) => `
            <button class="tp-swatch" data-accent="${key}" title="${a.label}">
              <span class="tp-swatch-dot" style="background: rgb(${a.clay});"></span>
              <span class="tp-swatch-name">${a.label}</span>
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
      panel.querySelectorAll('.tp-swatch').forEach(b => b.classList.toggle('is-active', b.dataset.accent === state.accent));
    };
    refresh();

    panel.querySelectorAll('.tp-swatch').forEach((b) => {
      b.addEventListener('click', () => {
        state.accent = b.dataset.accent;
        apply(); refresh(); persist();
      });
    });

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
