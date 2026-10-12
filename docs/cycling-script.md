# Cycling und feste Kopfposition

Alltagsprofil (Sofa): standardmäßig Natural, 66 % und 30° Schwenkbereich mit Oszillation an. Cycling (Rennrad): standardmäßig Natural und 100 %, danach die konfigurierte Positionierungs-Aktion. Modus und Leistung beider Profile lassen sich im Karteneditor einstellen.

## Voraussetzung für eine bestimmte Gradzahl

`number.smartmi_standing_fan_2s_oscillation_angle` setzt den Schwenkbereich. Sie meldet keine aktuelle Kopfposition. Die bislang genannten Entitäten enthalten keinen Live-Positionssensor. Eine feste Gradzahl kann damit weder die Karte noch ein Home-Assistant-Script zuverlässig anfahren.

Die [Referenzkarte](https://github.com/ikaruswill/lovelace-fan-xiaomi/blob/master/src/xiaomi-fan-card.ts) hat feste Schwenkbereiche 30/60/90/120° und setzt diese über `number.set_value` beziehungsweise `fan_set_oscillation_angle`. Ihre Links-/Rechts-Tasten nutzen separat `fan.set_direction`. Das ist keine Gradpositionierung. Ob Richtungsbefehle den Kopf bewegen, hängt von der Integration ab; siehe [Analyse](reference-features.md).

## Script-Vorlage installieren

Die [Script-Blueprint-Datei](../blueprints/script/fan_target_position.yaml) ist nur für Geräte mit zusätzlicher, echter numerischer Positionsrückmeldung gedacht. Sie erzeugt keinen Positionssensor und darf nicht mit dem Schwenkbereich als Rückmeldung betrieben werden.

1. In Home Assistant unter Einstellungen → Automatisierungen & Szenen → Blaupausen die URL importieren:
   `https://github.com/jancrab/smart-fan-2-card/blob/main/blueprints/script/fan_target_position.yaml`.
2. Ein Script aus der Blaupause erstellen und Ventilator, Schwenkbereich, tatsächlichen Positionssensor, Zielgradzahl, Toleranz und Zeitlimit auswählen.
3. Im Karteneditor unter **Cycling** Natural/Normal und Leistung auswählen. Als Ablauf **Oszillation aus → Links-Aktion** und als Aktion die erstellte `script.*`-Entität wählen.
4. Der Button stoppt Schwenken, setzt das Cycling-Profil und startet das Script. Die Zielgradzahl des serverseitigen Scripts wird im Script-Dialog konfiguriert. Alternativ kann die Karte über den Ablauf **Maximal schwenken → am Zielwinkel stoppen** mit demselben echten Positionssensor direkt steuern; dann steht der Zielwinkel im Karteneditor.

Das Script setzt den maximalen Schwenkbereich, startet Oszillation und stoppt bei Erreichen oder Überschreiten des Ziels. Bei Timeout oder verlorener Rückmeldung versucht es ebenfalls zu stoppen und meldet einen Fehler. Aktualisierungsintervall und Befehlslatenz begrenzen die Genauigkeit. Der maximale Schwenkbereich bleibt eingestellt. Das Script läuft auf dem HA-Server und benötigt keinen geöffneten Browser; manuelles Abbrechen des Scripts, HA-Ausfall oder Verbindungsverlust können den Stop-Befehl verhindern.

## Prüfung des versprochenen Verhaltens

- Alltag: Preset, 66 %, Winkel 30° und Oszillation werden über die vorhandenen Entitäten gesetzt. Das ist mit den gemeldeten Funktionen möglich.
- Cycling-Profil: Natural/100 % ist möglich. Eine konfigurierte Positionierungs-Aktion oder echte Rückmeldung ist zusätzlich erforderlich.
- Feste Kopfposition beim konkret gemeldeten Gerät: derzeit nicht nachweisbar, weil der Live-Positionssensor beziehungsweise eine bestätigte Positionierungs-Aktion fehlt. Eine Zeitsteuerung oder das Auslesen des Schwenkbereichs kann das nicht gradgenau ersetzen.
- Es werden keine vermeintlich erfolgreichen Kopfpositionen angezeigt, die nur aus dem Schwenkbereich abgeleitet wurden.
