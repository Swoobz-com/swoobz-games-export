# Rug or Riches — layout-spec per scherm

Puur layout: zones, uitlijning, blokvormen en maatvoering. Bestaande art, kleuren en componenten blijven ongewijzigd.

---

## 0. Globaal frame (geldt voor elk scherm)

**App-shell.** Eén CSS-grid over het hele viewport, drie rijen en twee kolommen:

```
grid-template-rows:    56px  1fr  40px        (topbar / main / onderbalk)
grid-template-columns: 1fr   320px            (speelveld / controlekolom)
```

- **Topbar** spant beide kolommen (grid-column: 1 / -1). Onderbalk ook.
- **Controlekolom** is een vaste rechterkolom van 320px breed, van topbar tot onderbalk. Geen zwevende panelen meer buiten deze kolom.
- **Speelveld** vult de rest.

**Spacing-systeem.** Eén schaal, overal: 8 / 12 / 16 / 24 px. Buitenmarge van de shell: 24px. Gutter tussen speelveld en controlekolom: 24px. Binnen panelen: padding 16px, onderlinge afstand tussen panelen: 12px.

**Vormtaal.**
- Panelen: rechthoek, border-radius 12px, 1px border, semi-transparante donkere fill (zoals huidige panelen). Allemaal even breed (100% van de kolom), alleen hoogte varieert.
- Knoppen: radius 8px, hoogte 44px (primair) / 36px (secundair).
- Safes/tegels: huidige vorm behouden; tegelmaat vast (bijv. 96px), gap 16px, dus gridbreedte = 5 × 96 + 4 × 16 = 544px.
- Chips/badges (recents, multiplier-pills): pill-vorm, radius 999px, hoogte 24px.

**Uitlijnregels.**
- Alle panelen in de controlekolom: linkerrand én rechterrand exact gelijk (één verticale as).
- Alle tekst binnen panelen links uitgelijnd; getallen die je vergelijkt (bedragen) rechts uitgelijnd op één as.
- Labels boven waarden, nooit ernaast (consistent label-boven patroon: klein muted label 11px, waarde eronder).
- Het speelbord: horizontaal én verticaal gecentreerd in het speelveld (flex, beide assen center). Nooit hoog met dode ruimte eronder.
- HUD-regel boven het bord: exact even breed als het bord (544px), zodat de randen ervan uitlijnen met de buitenste tegels.

**Hiërarchie in tekstgroottes.** Pump-multiplier 40–48px (grootste element op het scherm), paneelwaarden 20px, labels 11px caps, bodytekst 13px.

---

## 1. Scherm: Ready (voor de ronde, "Ape in")

**Topbar** (hoogte 56px, ruimte-verdeling via space-between):
- Links: logo + status "READY · R0001". Baseline-uitgelijnd op één regel.
- Rechts: balance. Verder niets — geen recents hier.

**Speelveld** (gecentreerde stack, verticale volgorde, gap 16px):
1. HUD-regel (breedte 544px): links "SAFE LEFT 22", rechts leeg (rug risk pas tijdens de ronde). Hoogte 32px.
2. Het 5×5 bord (544 × 544px) in zijn eigen boardplaat: bord + 24px padding rondom, radius 16px. De plaat is dus 592px breed en exact symmetrisch om het grid — niet breder aan één kant.
3. Onderschrift gecentreerd onder de plaat, 12px muted: "crack open, pump je multiplier, cash out voor de rug".

De uitleg ("Ape in. Dodge the rug.") verhuist van het losse zwevende paneel links naar een compacte intro bovenin de controlekolom, of naar een eenmalige overlay/modal bij eerste bezoek.

**Controlekolom** (van boven naar beneden, gap 12px):
1. Inzet-paneel: label "INZET", waarde 2.00 USDC met −/+ knoppen op één rij, waarde gecentreerd tussen de knoppen.
2. Mode-toggle Manual/Trail: segmented control, twee gelijke helften, volle kolombreedte.
3. **Primaire CTA "APE IN →"**: volle breedte, 44px hoog. Dit is het enige felgroene gevulde element in de kolom.
4. Sessiestats-paneel (leeg/nul bij start, maar wél al aanwezig zodat niets verspringt zodra de ronde begint).

**Onderbalk**: links korte hint ("plan een pad, dan go"), rechts recents-chips. Eén regel, 40px, verticaal gecentreerd.

---

## 2. Scherm: Ronde live (Trail-planning)

Zelfde skelet als scherm 1 — er verspringt niets, alleen inhoud verandert.

**HUD-regel boven het bord** (nu gevuld, breedte = bordbreedte):
- Links, baseline-uitgelijnd: pump-multiplier groot (40–48px) + daarnaast klein "BAG 2.00 USDC".
- Rechts, rechts uitgelijnd in twee regels: "RUG RISK 12%" met mini-progressbar (breedte 96px, hoogte 4px) en eronder "next safe → 1.10x".
- Deze regel vervangt de huidige losse hoekelementen linksboven/rechtsboven én het zwevende "Plan your trail"-paneel.

**Bord**: identieke positie en maat als scherm 1. Geplande trail-tegels krijgen een genummerde outline; geopende tegels de coin-art. Tegels veranderen nooit van maat of positie — alleen hun visuele staat.

**Controlekolom** (zelfde blokken, aangepaste staat):
1. Inzet-paneel: vergrendeld/gedimd tijdens de ronde (opacity 0.5, geen layoutwijziging).
2. Mode-toggle: actieve kant (Trail) gevuld, andere kant outline.
3. **Primaire CTA**: zelfde plek en maat, label nu "GO →" (of "TAKE PROFIT · 2.20 USDC" zodra er minstens één safe open is — één knop die van rol wisselt, of twee knoppen gestapeld: GO bovenaan, Take profit als outline-knop van 36px eronder).
4. Trail-info compact: "pad: 4 tegels · rugs: 3" — één regel, geen eigen groot paneel.
5. Sessiestats: net, best, won/lost. Drie waarden op één rij, elk met label erboven, kolommen gelijk verdeeld (grid 3 × 1fr).

**Onderbalk**: links live-status "OPEN 0/22 · een rug beëindigt de ronde", rechts recents. Recents staan dus nog steeds maar op één plek.

---

## 3. Scherm: Resultaat (win of rug)

Zelfde skelet. Het resultaat wordt getoond mét het bord zichtbaar, niet als apart scherm.

**Resultaat-banner** — in de plaats van de HUD-regel, zelfde hoogte-zone zodat het bord niet zakt:
- Breedte = bordbreedte, hoogte ~64px, radius 12px.
- Win: groene tint-achtergrond; links "SECURED THE BAG", rechts groot "1.22x · +0.44 USDC" rechts uitgelijnd.
- Rug: rode variant, "RUGGED" + verloren inzet.
- Dit vervangt de kleine tekst onderaan het scherm; het beloningsmoment krijgt de grootste visuele nadruk.

**Bord**: blijft staan met open tegels zichtbaar (coins genummerd in volgorde van openen); onaangeraakte tegels 40% gedimd zodat het resultaat leest als één beeld.

**Controlekolom**:
1. Inzet-paneel: weer actief.
2. Mode-toggle: actief.
3. **Primaire CTA**: "BET AGAIN →" op de vaste CTA-plek. Direct eronder "Bet again · same trail" als secundaire knop (36px, outline). Daaronder één rij met twee tekstknoppen naast elkaar: "New setup" links, "Share" rechts.
4. Sessiestats-paneel: geüpdatet, mét de sparkline erin ondergebracht — sparkline krijgt een label ("verloop") en zit ín het paneel, zweeft niet los.
5. Fairness-regel onderaan de kolom: "✓ verified · view receipt" als één compacte regel, 12px, muted.

**Onderbalk**: recents-chips geüpdatet (nieuwste links), verder identiek.

---

## Samengevat: wat dit oplost

Elke staat gebruikt exact hetzelfde skelet — topbar, gecentreerd bord met één infozone erboven, vaste controlekolom van 320px, onderbalk. Alleen inhoud en labels wisselen; posities en maten nooit. Daardoor verdwijnen de zwevende panelen, de scheve boardplaat, de dode ruimte onder het grid en de verspringende primaire knop.
