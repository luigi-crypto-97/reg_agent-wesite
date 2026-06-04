# Sicurezza area corrispondenza

Questa fase include un backend locale funzionante per login, sessione, protezione dashboard e API mock. Non è ancora l'architettura finale per documenti reali.

## Stato implementato ora

- Sessione via cookie `HttpOnly`, `SameSite=Lax`, `Secure` in produzione.
- Rate limit base sul login.
- Protezione server-side di `corrispondenza-cliente.html`.
- Protezione server-side di `admin.html`, riservata al ruolo admin.
- Separazione demo tra admin e cliente: l'admin vede tutta la posta, il cliente solo documenti pubblicati e associati al proprio `clientId`.
- API private per mail, PDF, archivio, supporto e segnalazioni.
- Header HTTP di sicurezza: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Resource-Policy`, CSP base e HSTS in produzione.
- Pagine private `noindex,nofollow` ed escluse dalla sitemap.

## Architettura richiesta per dati reali

- Autenticazione: utenti reali su database, password con Argon2id o provider IAM, MFA obbligatoria per admin, session rotation, revoca sessioni e device history.
- Autorizzazione: RBAC/ABAC per cliente, admin, reviewer; ogni query deve filtrare per tenant lato server.
- Crittografia in transito: HTTPS/TLS 1.3, HSTS, SMTP inbound con TLS forzato dove disponibile, DMARC/DKIM/SPF per i domini email.
- Crittografia a riposo: envelope encryption per ogni documento, chiavi per cliente gestite da KMS/HSM, rotazione chiavi, backup cifrati.
- Storage documenti: oggetti privati non pubblici, accesso solo tramite URL firmati a breve scadenza o streaming autenticato.
- Audit: log immutabile per login, visualizzazioni, download, assegnazioni, revisioni admin, errori OCR e override manuali.
- Processo posta: OCR e matching in coda isolata, soglie di confidenza, standby obbligatorio per casi dubbi, doppia approvazione per documenti sensibili.
- Segreti: nessun segreto nel repo; usare secret manager e variabili d'ambiente.
- Produzione: WAF, backup testati, vulnerability scanning, dependency audit, logging centralizzato, alerting e incident response.

## Nota su end-to-end encryption

La crittografia end-to-end pura significa che il server non può leggere i documenti. Questo è in tensione con OCR, smistamento automatico e revisione admin, perché quelle funzioni richiedono accesso al contenuto in chiaro almeno in un ambiente controllato.

Per questo prodotto la soluzione realistica ad alto livello è:

- cifratura forte in transito e a riposo;
- chiavi separate per cliente;
- decryption solo in worker isolati per OCR/matching;
- accesso admin tracciato e limitato;
- documenti scaricabili solo dopo autenticazione e autorizzazione;
- eventuale E2EE opzionale solo per documenti che non richiedono OCR o revisione umana.

Questa scelta evita di promettere una sicurezza tecnicamente incompatibile con lo smistamento automatico.
