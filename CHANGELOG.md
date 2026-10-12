# Changelog

## 0.7.0

- Cycling-Editor kann ein serverseitiges Positionierungs-Script mit neuer ID anlegen und als Kartenaktion verknüpfen. Erfordert Administratorrechte und einen echten Live-Positionssensor; legt keine vermeintliche Rückmeldung aus dem Schwenkbereich an.
- Script-Erstellung führt keine Gerätebewegung aus. Ein gespeichertes Script bleibt bei fehlender Registry-Auskunft über seinen Edit-Link erreichbar, statt erneut angelegt zu werden.
- Karte aktualisiert ihre Anzeige auch bei erneut übergebenem identischem `hass`-Objekt.
- Nach einem Preset-Wechsel wird der Gerätezustand über `homeassistant.update_entity` abgefragt. Profile setzen ihre Leistung erst nach dieser Abfrage, um den Moduswechsel bei Polling-Integrationen zu berücksichtigen.
- Regressionstest reproduziert die ausbleibende Natural-Anzeige bei wiederverwendetem `hass`-Objekt. Script-Erstellung, fehlende Berechtigung und fehlende Positionsrückmeldung getestet.

Build und alle 29 Tests erfolgreich. API-Erstellung und Natural-Verhalten noch nicht direkt in der betroffenen Home-Assistant-Instanz geprüft.

## 0.6.2

- Karteneditor lädt Home Assistants native Formular- und Selector-Komponenten vor dem Öffnen. Auf einem frisch geladenen Dashboard konnte `ha-form` bisher noch unregistriert sein, sodass die Auswahlfelder nicht funktionierten.
- Regressionstest für den ersten Editor-Aufruf und die Wiederverwendung bereits geladener Komponenten ergänzt. Der Test schlägt ohne den Fix fehl.
- Build und alle 24 Tests erfolgreich. Noch keine direkte Prüfung im betroffenen Home-Assistant-Dashboard.

## 0.6.1

- Optionaler Schwenkbereich-Slider erscheint nur bei eingeschaltetem Ventilator und aktiver Oszillation.
- Beim Abschalten der Oszillation wird er ausgeblendet; beim erneuten Einschalten zeigt er den aktuellen Winkelwert aus Home Assistant. Der Sichtbarkeitswechsel sendet keine Winkelbefehle.
- Verhalten beim Zustandswechsel getestet. Build und alle 23 Tests erfolgreich.

## 0.6.0

- Neue Alltagsprofil-Taste neben Cycling: standardmäßig Natural, 66 % und Oszillation mit 30° Schwenkbereich.
- Alltagsprofil mit Modus, Leistung und Schwenkbereich im Editor konfigurierbar; Cycling mit Modus und Leistung, standardmäßig Natural/100 %.
- Cycling setzt sein Profil vor dem konfigurierten Positionierungsablauf.
- Script-Blueprint und verlinkte Anleitung für serverseitiges Positionieren mit echter Live-Positionsrückmeldung ergänzt. Der Schwenkbereich ist weiterhin keine Positionsrückmeldung.
- Reihenfolge und Fehlerfälle der Profilbefehle getestet; aktive Alltagsmarkierung folgt den tatsächlichen Zuständen.

Build und alle 23 Tests erfolgreich. Eine absolute Kopfposition ist mit den bisher gemeldeten Geräteentitäten nicht nachweisbar; Blueprint und echte Gerätebewegung sind noch nicht in Home Assistant getestet.

## 0.5.0

- Editor zeigt zunächst nur Ventilator und Layout; Darstellung, manuelle Moduszuordnung und Cycling liegen in optionalen Bereichen.
- Cycling zeigt nur die zum ausgewählten Ablauf passenden Felder.
- Optionaler Schwenkbereich-Slider unter den Buttons, mit automatischer Winkel-Entitätszuordnung und Übernahme von Min/Max/Schrittweite.
- Ungültige alte Preset-Zuordnungen blockieren die automatische Erkennung nicht mehr.
- Xiaomi-Presets `nature`/`normal` in beiden Richtungen getestet; Vorschau nutzt diese Werte.

Build und alle 20 Tests erfolgreich. Verhalten am echten Gerät noch zu prüfen.

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
