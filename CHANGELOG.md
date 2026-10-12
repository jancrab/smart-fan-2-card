# Changelog

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
