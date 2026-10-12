# Changelog

## 0.4.0

- Fan-Symbol übernimmt Ein/Aus; separaten Power-Button entfernt.
- Fan-Icon rotiert im Betrieb und steht ausgeschaltet still; respektiert „Bewegung reduzieren“.
- Cycling zeigt ein eingebettetes Rennrad-SVG mit Fahrer in Zeitfahrhaltung. Beim Zielwinkel-Ablauf bleibt die Stopptaste erhalten.
- Fan-Schalter bleibt auch in sehr schmalen Karten verfügbar und hat mindestens 44 × 44 px Bedienfläche.
- Interaktive Dark-Mode-Vorschau mit beiden Layouts und Theme-Variablen ergänzt.
- README mit aktuellem Screenshot, Installation, Cache-Aktualisierung und HACS-Button aktualisiert. Repository öffentlich für HACS Custom Repository verfügbar.

Build und alle 18 Tests erfolgreich. Noch nicht am echten Gerät getestet.

## 0.3.0

- Kompaktes Layout mit kleinen Geräte-Icons und einer gemeinsamen Reihe für Natural, Stärke, Schwenken und Cycling.
- Große Lüftergrafik, doppelte Prozentanzeige, Branding-Fußzeile und redundantes Modusmenü entfernt.
- Mindestens 44-px-Bedienflächen, zugängliche Namen, Tooltips und sichtbarer Tastaturfokus.
- Breite Variante passt sich an ihre tatsächliche Containerbreite an.
- Lokale Vorschau mit echten Material Design Icons.

## 0.2.0

- Cycling im visuellen Editor: Ablauf, Schwenkbereich-Entität, Positionsrückmeldung, Zielwinkel, Maximalwinkel, Toleranz und Zeitlimit einstellbar.
- Optionales Schwenken bis zum Zielwinkel mit Stop bei Erreichen/Überschreiten, Abbruch, verlorener Rückmeldung und Timeout.
- Analyse der Referenzkarte und der unterschiedlichen Xiaomi-Integrationen dokumentiert.

Der Zielwinkel-Ablauf benötigt echte Positionsrückmeldung; sie ist für den konkreten Smartmi noch nicht bestätigt. Browserausfall oder Verbindungsverlust kann einen Stop verhindern.

## 0.1.0

- Erste Version mit schmalem und breitem Layout.
- Visuelle Auswahl aller Fan-Entitäten und automatische Übernahme des Gerätenamens.
- Normal/Natural, Stärke 1–3 (33/66/100 %), Geschwindigkeit und Schwenken.
- Konfigurierbarer Cycling-Ablauf: Oszillation aus, danach Links-Aktion.
- HACS-Manifest, gebündelte Distribution, Tests und Release-Workflow.

Noch nicht am echten Gerät getestet. Cycling benötigt eine gerätespezifische Aktion für die absolute Linksposition; der Oszillationswinkel allein reicht dafür nicht aus.
