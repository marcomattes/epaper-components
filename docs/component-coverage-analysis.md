# Komponenten-Coverage-Analyse aus fünf Nutzerprofilen

Stand: 2026-08-28 · Basis: `main` (V1.2.0, 70 Komponenten / 95 registrierte Custom Elements)

Fünf unabhängige Analysen haben die Library jeweils aus der Sicht eines
konkreten Einsatzfelds geprüft — Quellcode (JSDoc, `observedAttributes`,
Events), Stories, Test-Suiten und `styles/`. Bewertet wurden **Relevanz**
und **Reife** (0 = unbrauchbar, 1 = Grundgerüst, 2 = brauchbar mit Lücken,
3 = vollständig) jeder relevanten Komponente sowie **Lücken** (fehlende
Komponenten und fehlende Features), jeweils mit Schwere: _blockierend /
erschwerend / nice-to-have_.

Die fünf Profile:

| #   | Profil                 | Einsatzfeld                                 | Abdeckung (Schätzung)                        |
| --- | ---------------------- | ------------------------------------------- | -------------------------------------------- |
| P1  | Retail & ESL           | Preisschilder, Regaletiketten, POS-Displays | ~60 %                                        |
| P2  | Industrie & IoT        | Maschinenstatus, Sensor-Dashboards, Polling | ~70 %                                        |
| P3  | Smart Office           | Türschilder, Raumbuchung, Wegeleitung       | ~60–65 %                                     |
| P4  | Kiosk & Self-Service   | Touch-Formulare, Check-in, Feedback         | ~55 % (Kiosk) / ~85 % (klassische Formulare) |
| P5  | Publishing & Dokumente | Aushänge, Speisekarten, Versionierung       | ~55–60 %                                     |

**Gesamtbild:** Die Library ist überall dort stark, wo sie e-paper-spezifisch
gedacht ist — Surgical Patching, Refresh-Budgets, Status ohne Farbe,
timerlose Zeitkomponenten, `ElementInternals`-Formularteilnahme. Die Lücken
liegen fast durchgängig **im fachlichen Kern des jeweiligen Einsatzfelds**
(Preis/Barcode, Termin-Zeitmodell, Fließtext, Kiosk-Eingabearten) sowie in
vier **Querschnittsproblemen**, die mehrere Profile unabhängig voneinander
gefunden haben.

---

## Querschnittsbefunde (von mehreren Profilen unabhängig gemeldet)

### Q1 — Reaktivitätslücke: Kinder/Items werden nur bei `connectedCallback` gelesen

Gemeldet von **allen fünf Profilen**. Betroffen: `e-timeline`,
`e-description-list`, `e-breadcrumb`, `e-avatar-group`, `e-segmented`,
`e-anchor` sowie die Optionslisten von `e-radio-group`, `e-checkbox-group`
und `e-select`. Nachträglich eingefügte oder geänderte Kinder werden nie
gerendert (z. B. `timeline.ts:27-71`, `description-list.ts:33-55`,
`radio-group.ts:36`). Für jedes Display, das per Polling oder OTA
aktualisiert wird, erzwingt das einen Remount — und widerspricht damit der
eigenen Surgical-Patching-Regel. `e-timeline` ist zudem nicht in der
Refresh-Budget-Suite erfasst.

### Q2 — `e-table` bricht das Surgical-Patching-Versprechen

Gemeldet von **vier Profilen** (P1–P3, P5). Jede `data`-Änderung löst
`_build()` → `replaceChildren(table)` aus (`table.ts:156-159`, `:405`) —
ein GC16-Vollrefresh bei jedem Poll, ausgerechnet bei der Komponente, die
tabellarische Live-Übersichten trägt. Die Refresh-Budget-Suite testet nur
`selected`, nicht den `data`-Pfad. Dazu: Zellen sind reines `textContent`
(`table.ts:354`) — kein Status-Markup, kein Formatter, kein `<caption>`.
`e-status-board` zeigt im selben Repo das korrekte keyed-Diffing-Muster.

### Q3 — Hart englische Texte ohne i18n-Pfad

Gemeldet von **drei Profilen** (P1, P3, P5). Betroffen: `e-change-marker`
(Cue-Texte), `e-last-updated` (Relativangaben + Freshness-Labels),
`e-meter` (Bandlabels), `e-statistic` (Trendtexte), `e-pagination`
(„Previous"/„Next"), `e-calendar` und `e-date-picker` (Wochentagslabels,
Sonntag-first, Eyebrow `CALENDAR · <Jahr>`). `locale` wirkt, wo vorhanden,
nur auf absolute Zeitstempel. Für deutschsprachige Deployments sind mehrere
Komponenten ohne Fork nicht einsetzbar.

### Q4 — Formular-Querschnitt: `disabled` und sichtbare Invalid-Zustände

Gemeldet von P4, betrifft aber jede interaktive Anwendung:

- **`disabled` fehlt bei 10 von 14 Controls.** Nur `e-input`, `e-textarea`,
  `e-checkbox`, `e-toggle` implementieren `formDisabledChanged()`;
  `e-select`, `e-radio-group`, `e-checkbox-group`, `e-input-number`,
  `e-date-picker`, `e-time-picker`, `e-cascader`, `e-tree-select`,
  `e-upload` ignorieren es vollständig — auch `<fieldset disabled>` bleibt
  wirkungslos.
- **Invalid-Zustand von Composite-Controls ist unsichtbar.** `aria-invalid`
  wird in `components.css` nur für `.ink-control` (Input/Textarea) gestylt
  (`components.css:34,38`). Select-, Radio-, Checkbox-Gruppen und Upload
  setzen `aria-invalid` ohne jede visuelle Wirkung — auf einem
  Graustufen-Panel ohne Farbe/Animation ist ein Pflichtfeldfehler dort für
  Sehende unsichtbar.
- **`aria-describedby` existiert nirgends** (0 Treffer im gesamten
  `components/`): Hint- und Fehlertexte von `e-form-item` sind nicht mit dem
  Control verknüpft; Screenreader hören die Fehlermeldung nie.
- `e-input-number` umgeht als einziges Control das Deferred-Validation-Gate
  (`input-number.ts:221` setzt `aria-invalid` direkt statt über
  `_markInvalid()`).

### Q5 — Statusanzeige-Primitive zu schwach, Vokabular geschlossen

Gemeldet von P1, P2, P3. `e-badge` hat als einziges Attribut `inverted`,
`e-ribbon` nur `text` mit CSS-fixierter Position. `e-status-board` kennt
nur `ok/warning/critical/offline/neutral` — „Frei/Belegt/Gesperrt" oder
„verfügbar/ausverkauft" müssen darauf verbogen werden. Die projekteigene
Türschild-Demo baut die Status-Pille deshalb von Hand
(`apps/site/src/content.ts`, `roomShowcase()`).

### Q6 — Icon-Registry geschlossen und ohne Domänen-Glyphen

Gemeldet von P1, P2, P3. `core/icons.ts` (37–40 Glyphen) hat keine
Erweiterungs-API (`hasIcon()` prüft nur gegen `ICONS`) und es fehlen
Retail- (Warenkorb, Euro, Prozent, Paket), Industrie- (Warndreieck,
Thermometer, Play/Pause/Stop) und Office-Glyphen (Kalender, Uhr, Tür,
Diagonalpfeile für Wegeleitung). Sichtbare Folge: `e-alert` nutzt `bell`
für „warning" und `close` für „error".

---

## Priorisiertes Backlog

Priorität = Anzahl betroffener Profile × Schwere. B = blockierend,
E = erschwerend, N = nice-to-have.

### Prio 1 — Querschnitt, mehrfach blockierend

| #   | Maßnahme                                                                                                                                                                           | Schwere | Profile                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------- |
| 1.1 | `e-table`: keyed Row-Diffing (`row-key`), Zell-Formatter/Status-Markup, `data`-Update-Szenario in der Refresh-Budget-Suite                                                         | B       | P1 P2 P3 P5             |
| 1.2 | Reaktivität der connect-only-Komponenten (Q1): Items/Optionen bei DOM-/Attributänderung nachziehen, surgical                                                                       | B/E     | alle                    |
| 1.3 | `disabled`/`formDisabledChanged()` für die 10 fehlenden Controls                                                                                                                   | B       | P4 (+alle interaktiven) |
| 1.4 | Sichtbarer Invalid-Zustand für Composite-Controls in `components.css` + `aria-describedby`-Verdrahtung von Hint/Error; `e-input-number`-Gate fixen                                 | B       | P4 (+alle interaktiven) |
| 1.5 | Termin-Datenmodell: `CalendarEvent` um `start`/`end`/`status` erweitern; `e-agenda`/`e-schedule` (Tages-/Wochen-Zeitachse, „Jetzt"-Marker); `e-month-change`-Event an `e-calendar` | B       | P3 (B), P2 (E)          |
| 1.6 | Status-Pill-Komponente mit freiem Vokabular (Frei/Belegt, verfügbar/ausverkauft …) + `e-badge` um `variant`/`size` ausbauen + `e-status-board`-Vokabular öffnen                    | B/E     | P1 P2 P3                |
| 1.7 | i18n-Pfad für alle hart englischen Strings (Q3): Attribute oder zentrales Locale-Registry                                                                                          | E       | P1 P3 P5                |

### Prio 2 — branchenspezifisch blockierend

| #   | Maßnahme                                                                                                                                                                                                                           | Schwere | Profil |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| 2.1 | `e-barcode` (EAN-13/EAN-8/Code128) nach dem `e-qrcode`-Bauprinzip (selbst enthaltener Encoder → 1-Bit-SVG)                                                                                                                         | B       | P1     |
| 2.2 | `e-price`: Währungsformatierung (`Intl.NumberFormat`), Streichpreis (`line-through` existiert nirgends im Stylesheet), Grundpreis €/kg; dieselbe Formatierung rückwirkend in `e-statistic`                                         | B       | P1     |
| 2.3 | Neue Form-Controls als `BaseFormControl<T>`-Subklassen: `e-rating`, `e-slider` (kein einziger `input[type=range]`-Style vorhanden), `e-pin-input`, `e-signature` (Basisklasse trägt via `parseFile()`/`serialize(): File` bereits) | B       | P4     |
| 2.4 | `e-prose`/`e-article`: typografischer Container für eingebettetes Dokument-HTML (h2, p, ul/ol, blockquote, figure) — größter Einzelhebel für Publishing                                                                            | B       | P5     |
| 2.5 | Text-Diff/Redlining (`e-diff mode="text"` oder `e-redline` mit ins/del auf Wortebene) — `e-diff` vergleicht heute nur zwei Attributwerte                                                                                           | B       | P5     |
| 2.6 | Daten-getriebene, append-fähige Alarm-/Ereignisliste (`e-event-log` mit keyed `data`)                                                                                                                                              | B       | P2     |
| 2.7 | `e-keypad`/Bildschirmtastatur (Kiosk-Browser haben keine OS-Tastatur)                                                                                                                                                              | B       | P4     |

### Prio 3 — erschwerend, mehrfach genannt

| #    | Maßnahme                                                                                                                                                                   | Profile  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 3.1  | `e-date-picker`/`e-time-picker`: `min`/`max`, gesperrte Tage, Minuten-`step`                                                                                               | P3 P4    |
| 3.2  | Icon-Registry öffnen (Registrier-API) + Domänen-Glyphen ergänzen (Q6)                                                                                                      | P1 P2 P3 |
| 3.3  | Schwellwertsemantik durchziehen: `status`/`low`/`high` an `e-statistic`, konfigurierbare Grenzwertlinie an `e-sparkline` (heute hart y=18), Bandwechsel-Event an `e-meter` | P2       |
| 3.4  | `e-card-image`: `cover` soll eine Bild-URL akzeptieren (heute nur Hatch/Text — Name verspricht Bilder)                                                                     | P1 P5    |
| 3.5  | `e-select`: Suche/Filter, Option-`disabled`, `disabled`                                                                                                                    | P4 P3    |
| 3.6  | Wizard-Mechanik: `e-steps` mit `aria-current`/Fehlerstatus koppeln, `e-tabs` programmatisch schaltbar (`value`), Pro-Schritt-Validierung                                   | P4       |
| 3.7  | `e-toc` + automatische `id`-Vergabe in `e-title`; `e-anchor` reaktiv + Auto-Scan                                                                                           | P5       |
| 3.8  | `e-form`: `e-invalid`-Event, Fokus aufs erste fehlerhafte Feld, `validationMessage` → `e-form-item.error` automatisch                                                      | P4       |
| 3.9  | `e-qrcode`: Theme-Farben statt hart `#fff`/`#000`, freies `aria-label`, Zielbreiten-Modus; `e-watermark`: Token-Farbe statt `#000`, mehrzeilig                             | P1 P5    |
| 3.10 | Panel-Größen-Presets (1,54"–4,2", Rotation, Safe-Area) + `e-fit-text` (einmaliges Shrink-to-Fit ist e-paper-konform)                                                       | P1       |
| 3.11 | `e-countdown`/`e-time-remaining` und `e-clock`/`e-datetime` (timerlos, `now`-Attribut wie `e-last-updated`)                                                                | P3       |
| 3.12 | `e-upload`: `capture`-Attribut; `e-textarea`: `label`/`hint`/`rows`/Zeichenzähler                                                                                          | P4       |
| 3.13 | Idle-Timeout/Auto-Reset für Kiosk (`e-idle-reset` oder Timeout an `e-dialog`)                                                                                              | P3 P4    |
| 3.14 | BWR-Theme-Pack (schwarz/weiß/rot — verbreitete ESL-Hardware)                                                                                                               | P1       |

### Prio 4 — nice-to-have (Auswahl)

`e-gauge` (P2) · `e-connection-status`/`e-device-status` (P2 P3) ·
`e-slot-picker` (P3) · `e-person-card`/`e-presence` (P3) ·
`e-blockquote`, `e-footnote`, `e-columns`, `e-reader`/Seitenumbruch (P5) ·
`e-shelf-label`-Composite, `e-battery` (P1) · `e-fieldset`, `e-phone-input`
(P4) · Print-/`@page`-Stylesheet (P5) · Sticky-Header an `e-table` (P2) ·
`e-floorplan`, `e-notice` mit Gültigkeitszeitraum (P3).

---

## Profil 1 — Retail & Electronic Shelf Labels

**Fazit:** Rahmen und Rohbau sehr gut (Layout, Karten, QR, Statuskacheln,
farbunabhängige Änderungs-Cues, Refresh-Budget passt zur
Batterie-Anforderung) — aber der fachliche Kern des Preisschilds fehlt:
kein Barcode, keine Preisformatierung (`Intl.NumberFormat` kommt in der
Library nicht vor), kein Streichpreis (`line-through` existiert nicht),
`e-card-image` akzeptiert keine Bild-URL. **~60 %.**

| Komponente                                                             | Relevanz | Reife | Anmerkung                                                                            |
| ---------------------------------------------------------------------- | -------- | ----- | ------------------------------------------------------------------------------------ |
| qrcode                                                                 | hoch     | 3     | Vollständiger dependency-freier Encoder; Farben hart `#fff`/`#000`, `aria-label` fix |
| change-marker                                                          | hoch     | 3     | Ideal für Preisänderung; Cue-Texte hart englisch                                     |
| table                                                                  | hoch     | 3     | JSON-getrieben, `e-sort`/`e-select`; kein Zell-Formatter                             |
| status-board                                                           | hoch     | 3     | Keyed Items, Status mit Text+Pattern-Cue                                             |
| meter                                                                  | hoch     | 3     | Bestand/Batterie; Bandlabels englisch                                                |
| image                                                                  | hoch     | 3     | `fallback`/`lazy`/`caption` inkl. Fehlerpfad                                         |
| text / title                                                           | hoch     | 3     | Keine Durchstreichung verfügbar                                                      |
| grid / flex / space / divider                                          | hoch     | 3     | Reicht für 1,5"–4"-Raster                                                            |
| statistic                                                              | hoch     | 2     | Nur `toFixed()` — kein Tausenderpunkt, keine Währung; Wertgröße starr h1             |
| badge                                                                  | hoch     | 2     | Nur `inverted` — als Rabatt-Flag zu wenig                                            |
| ribbon                                                                 | hoch     | 2     | Nur `text`, Position CSS-fixiert                                                     |
| icon                                                                   | hoch     | 2     | Keine Retail-Glyphen in der Registry                                                 |
| description-list                                                       | hoch     | 2     | Items nur bei Connect gelesen — OTA-Update erfordert Remount                         |
| card-image                                                             | hoch     | 1     | `cover` akzeptiert keine Bild-URL (nur Hatch/Text)                                   |
| card / list / diff / tag / badge-count / alert / watermark / sparkline | mittel   | 3     | Solide                                                                               |
| last-updated                                                           | mittel   | 2     | Relativtexte hart englisch                                                           |
| empty / skeleton / result / progress                                   | niedrig  | 3     | Zustände abgedeckt                                                                   |
| layout                                                                 | niedrig  | 2     | Keine Panel-Größen-Presets                                                           |

**Fehlende Komponenten:** `e-barcode` (B), `e-price` (B),
`e-promo-flag` (E), `e-stock-status` (E), Panel-Presets/`e-panel` (E),
`e-fit-text` (E), `e-battery` (N), `e-shelf-label`-Composite (N).

**Fehlende Features:** `e-statistic` Locale-/Währungsformat + Größenstufe
(B); `e-card-image` Bild-URL (B); `e-description-list` reaktive Items (E);
`e-qrcode` Label/Theme-Farben/Zielbreite (E); `e-ribbon` `placement`/
`inverted` (E); `e-badge` `size` (E); `e-text` `kind="strike"` (E);
Retail-Icons (E); i18n über change-marker/last-updated/meter/statistic (E);
BWR-Theme-Pack (E); `e-table` Zell-Formatter (N).

---

## Profil 2 — Industrie & IoT-Monitoring

**Fazit:** Stärkstes Feld der Library (~70 %): `e-status-board`,
`e-meter`, `e-last-updated`, `e-change-marker`, `e-diff` sind ersichtlich
für sparsame Teilupdates gebaut, inkl. Mutation-/Dirty-Area-Budgets, und
„Bedeutung nie nur über Farbe" ist durchgezogen. Der große Bruch ist
`e-table` (Vollrebuild bei jedem `data`-Poll); außerdem fehlen eine
daten-getriebene Alarmliste und durchgängige Schwellwertsemantik.

| Komponente                                                                                                | Relevanz | Reife | Anmerkung                                                                             |
| --------------------------------------------------------------------------------------------------------- | -------- | ----- | ------------------------------------------------------------------------------------- |
| status-board                                                                                              | hoch     | 3     | Keyed Cells, eigenes Refresh-Budget im Test                                           |
| meter                                                                                                     | hoch     | 3     | `low`/`high`-Bänder, `role="meter"`, Segmente einzeln gepatcht                        |
| last-updated                                                                                              | hoch     | 3     | Freshness-Stufen, timerlos + `refresh()` — passt zum Poll-Zyklus                      |
| change-marker                                                                                             | hoch     | 3     | `tolerance` gegen Messrauschen, opt-in Live-Region                                    |
| sparkline                                                                                                 | hoch     | 3     | Sauber gepatcht, aber sehr schmal (eine Serie, keine Grenzwertlinie)                  |
| progress / alert / diff                                                                                   | hoch     | 3     | Severity über Icon/Rahmen/Hatch; `diff` gut für Soll/Ist                              |
| card / grid / flex / space / layout / divider                                                             | hoch     | 3     | Dashboard-Kacheln                                                                     |
| table                                                                                                     | hoch     | 1     | `data`-Änderung → `replaceChildren` — Vollrefresh statt Patching                      |
| statistic                                                                                                 | hoch     | 2     | Keine Schwellwert-/Alarmsemantik                                                      |
| description-list                                                                                          | hoch     | 2     | Keine Live-Werte (connect-only)                                                       |
| timeline                                                                                                  | hoch     | 1     | Nachträglich angehängte Items werden nie gerendert                                    |
| badge / tag / badge-count / ribbon / empty / skeleton / segmented / tabs / pagination / qrcode / collapse | mittel   | 3     | Solide Primitive                                                                      |
| steps / list / calendar / icon                                                                            | mittel   | 2     | `list` nicht daten-getrieben; `calendar`-Events ohne Uhrzeit; keine Industrie-Glyphen |
| result / dialog / popover / dropdown / affix / anchor / back-top / watermark                              | niedrig  | 3     | Randfälle abgedeckt                                                                   |

**Fehlende Komponenten:** `e-alarm-list`/`e-event-log` (B),
`e-trend-chart` (E), `e-shift-plan`/`e-schedule` (E), `e-gauge` (N),
`e-connection-status` (N).

**Fehlende Features:** `e-table` keyed Row-Diffing (B) + Status pro
Zelle/Zeile (E) + Sticky Header (N); `e-statistic` Schwellwerte (E) +
`announce` (N); `e-sparkline` Grenzwertlinie (E) + Balken/Multi-Serie (N);
`e-timeline` dynamisches Anhängen (E); `e-description-list` reaktive Werte
(E); `e-list` `data`-Attribut (E); Industrie-Icons (E); `e-calendar`
Event-Modell mit Uhrzeit (E); `e-meter` Bandwechsel-Event (N);
`e-status-board` Events/Drill-down (N).

---

## Profil 3 — Smart Office & Raumbeschilderung

**Fazit:** Layout, Touch-Ziele (44 px ab Token-Ebene), QR, Dialog-Mechanik
und Status-Kacheln reif — aber es gibt **kein Datenmodell für einen Termin
mit Anfang und Ende** und keine Belegt/Frei-Komponente; die projekteigene
Türschild-Demo baut beides von Hand. **~60–65 %.**

| Komponente                                                                                                                           | Relevanz | Reife | Anmerkung                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----- | ------------------------------------------------------------------------------- |
| status-board / qrcode / list / alert / dialog / button / description-list / table                                                    | hoch     | 3     | Tragende Bausteine reif                                                         |
| calendar                                                                                                                             | hoch     | 2     | Events nur `{date, title}`; kein Monatswechsel-Event; fest 6×7; Labels englisch |
| timeline                                                                                                                             | hoch     | 2     | Agenda-Muster passt, aber connect-only und kein „Jetzt"-Marker                  |
| avatar / avatar-group                                                                                                                | hoch     | 2     | Gruppe connect-only, kein Anwesenheits-Indikator                                |
| last-updated / icon / time-picker / date-picker / segmented                                                                          | hoch     | 2     | i18n bzw. `min`/`max` bzw. Reaktivität fehlen                                   |
| badge                                                                                                                                | hoch     | 1     | Nur `inverted` — wichtigster Zustandsträger ohne Ausdrucksmittel                |
| tabs / meter / progress / statistic / change-marker / sparkline / result / empty / layout-familie / menu / tree / breadcrumb / steps | mittel   | 3     | Solide                                                                          |
| ribbon                                                                                                                               | niedrig  | 2     | Notlösung für „Belegt"                                                          |
| watermark / title / text / skeleton / form-controls                                                                                  | niedrig  | 3     | Randnutzung                                                                     |

**Fehlende Komponenten:** `e-room-status`/`e-status-pill` (B),
`e-agenda`/`e-schedule` (B), `e-slot-picker` (E), `e-countdown` (E),
`e-clock`/`e-datetime` (E), `e-direction`/Wegeleitung (E),
`e-person-card` (N), `e-notice` (N), `e-device-status` (N),
`e-floorplan` (N).

**Fehlende Features:** `e-calendar` Zeit/Dauer/Status (B) +
Monatswechsel-Event (B) + Wochen-/Tagesansicht (E) + i18n (E) +
`min`/`max`/`readonly` (E); `e-timeline` Reaktivität + „Jetzt"-Marker (E);
`e-avatar-group`/`e-segmented` Reaktivität (E); `e-status-board` freies
Vokabular (E); `e-badge` `variant`/`size` (E); `e-last-updated` i18n (E);
Icon-Registrier-API (E); `e-time-picker`/`e-date-picker` Grenzen (E);
`e-table` Zell-Status (E); `e-dialog` Auto-Close (N).

---

## Profil 4 — Kiosk & Self-Service-Formulare

**Fazit:** Das `BaseFormControl`-Fundament ist überdurchschnittlich
(ElementInternals, BFCache-Restore, Deferred-Validation-Gate, ~4.700
Zeilen Form-Tests) — für klassische Formulare ~85 %. Für Touch-Kioske nur
~55 %: die vier feld-definierenden Eingabearten (Slider, Rating, PIN,
Unterschrift) fehlen komplett, ebenso Bildschirmtastatur und
Wizard-Mechanik; dazu die Querschnittsfunde Q4 (unsichtbare
Invalid-Zustände, `disabled`-Lücke).

| Komponente                                                                | Relevanz    | Reife | Anmerkung                                                                |
| ------------------------------------------------------------------------- | ----------- | ----- | ------------------------------------------------------------------------ |
| input / button / checkbox / toggle / dialog / result                      | hoch        | 3     | `e-input` ist die Referenzimplementierung                                |
| form / form-item                                                          | hoch        | 2     | Kein `aria-describedby`, kein `validationMessage`-Mapping, keine Summary |
| textarea                                                                  | hoch        | 2     | Kein `label`/`hint`/`rows` (anders als `e-input`)                        |
| select                                                                    | hoch        | 2     | Kein `disabled`, keine Option-`disabled`, keine Suche, kein `multiple`   |
| radio-group / checkbox-group                                              | hoch        | 2     | Kein `disabled`, Optionen connect-only, keine Touch-Kachel-Variante      |
| input-number                                                              | hoch        | 2     | Kein `disabled`/`readonly`; umgeht das Deferred-Gate                     |
| upload                                                                    | hoch        | 2     | Kein `capture`, kein `disabled`                                          |
| steps                                                                     | hoch        | 2     | Rein visuell: kein `aria-current`, kein Fehlerstatus, keine Navigation   |
| date-picker / time-picker                                                 | hoch/mittel | 2     | Keine `min`/`max`/Sperrtage/`step`                                       |
| segmented                                                                 | hoch        | 1     | Nicht `BaseFormControl` — keine Formularteilnahme                        |
| tabs                                                                      | mittel      | 1     | Kein `value`-Setter — als Wizard-Host unbrauchbar                        |
| chip                                                                      | mittel      | 1     | Nicht formularassoziiert                                                 |
| alert / progress / qrcode / popover / popconfirm / cascader / tree-select | mittel      | 2–3   | Brauchbar; Cascader/Tree-Select ohne `disabled`                          |
| empty / card / layout-familie / float-button / back-top                   | niedrig     | 2–3   | Gerüst                                                                   |

**Fehlende Komponenten:** `e-slider` (B), `e-rating` (B),
`e-pin-input` (B), `e-signature` (B), `e-keypad` (B),
`e-wizard`/`e-form-steps` (E), `e-phone-input` (E), `e-idle-reset` (E),
`e-fieldset` (N).

**Fehlende Features:** `disabled` bei 10 Controls (B); sichtbarer
Invalid-Zustand für Composite-Controls (B); `aria-describedby` überall (E);
`e-form-item` Fehlertext aus Validity (E); `e-form` Invalid-Event +
Fokussteuerung (E); `e-select` Suche/Option-`disabled` (E); dynamische
Optionen (E); Touch-Kachel-Variante für Radio/Checkbox (E); `e-upload`
`capture` (E); `e-textarea` Ausbau (E); `e-input-number` Gate-Fix (E);
Picker-Grenzen (E); `e-steps` `aria-current` (N); `e-tabs` `value` (N).

---

## Profil 5 — Publishing & Dokumenten-Displays

**Fazit:** Chrome und Rahmen gut (Titel-Skala mit Serif-Prose,
`e-collapse`, `e-image` mit `figcaption`, `e-affix`, `e-watermark`) — der
Kern **Fließtext** fehlt: kein Prose-Container, keine Zitate/Fußnoten,
keine echte Mehrspaltigkeit, und `e-diff` ist trotz Namens kein Text-Diff.
**~55–60 %.**

| Komponente                                                               | Relevanz | Reife | Anmerkung                                                                  |
| ------------------------------------------------------------------------ | -------- | ----- | -------------------------------------------------------------------------- |
| collapse / image                                                         | hoch     | 3     | Reifste Vertreter (native `<details>`; `<figure>`+`<figcaption>`)          |
| text / title                                                             | hoch     | 2     | Kein `caption`-Kind (Token existiert ungenutzt), keine Auto-`id` an Titeln |
| last-updated / anchor / pagination / watermark / description-list / link | hoch     | 2     | i18n, Reaktivität, `target`/`rel` fehlen                                   |
| diff                                                                     | hoch     | 1     | Vergleicht zwei Attributwerte, kein Text-Diff — für Redlining unbrauchbar  |
| divider / change-marker / affix / qrcode / back-top / table              | mittel   | 3     | Solide; `e-table` ohne `<caption>`/Zell-Markup                             |
| list / breadcrumb / timeline / masonry                                   | mittel   | 2     | Kein `ordered`-Modus; connect-only; Masonry verhindert Textfluss           |
| card-image                                                               | niedrig  | 1     | `cover` rendert kein Bild                                                  |
| tag / badge / ribbon / tabs / segmented                                  | niedrig  | 2–3   | Kennzeichnung/Sprachumschaltung ok                                         |

**Fehlende Komponenten:** `e-prose`/`e-article` (B),
Text-Diff/Redlining (B), `e-toc` (E), `e-columns` (E), `e-blockquote` (E),
`e-footnote` (E), `e-reader`/`e-page-view` (E), eigenständige
`e-figure`/`e-caption` (N), Print-Stylesheet (N), `e-revision` (N).

**Fehlende Features:** `e-title` Auto-`id` (E); `e-text`
`caption`/`align`/Truncation (E); `e-last-updated` + `e-pagination` i18n
(E); `e-anchor` Reaktivität/Auto-Scan/`depth`>1 (E); `e-watermark`
Token-Farbe/mehrzeilig (E); `e-image` `align`/`credit`/`srcset` (E);
`e-link` `target`/`rel` (E); `e-list` `ordered` (E); `e-table`
`caption`/Zell-Markup (E); connect-only-Reaktivität (E);
`e-card-image` Bild-URL (N).

---

## Methodik & Grenzen

Jedes Profil wurde von einem eigenen Analyse-Lauf (read-only) erhoben, mit
identischem Briefing, Bewertungsskala und Ausgabeformat; die Konsolidierung
hat Mehrfachnennungen zusammengeführt und nach _Anzahl Profile × Schwere_
priorisiert. Abdeckungsprozente sind Experteneinschätzungen der jeweiligen
Profilsicht, keine Messwerte. Codeverweise (Datei:Zeile) beziehen sich auf
den Stand von `main` am Analysetag; einzelne Zeilennummern können mit
späteren Commits wandern.
