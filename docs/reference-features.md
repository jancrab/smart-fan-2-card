# Analyse: lovelace-fan-xiaomi

Geprüft am 12. Oktober 2026 anhand von README und `src/xiaomi-fan-card.ts` aus [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi).

| Funktion | Umsetzung der Referenzkarte | Bedeutung für unsere Karte |
| --- | --- | --- |
| Ein/Aus und Geschwindigkeit | Standard-Fan-Services, zyklische Geschwindigkeitsstufen | Bereits vorhanden, unsere Stufen bleiben 33/66/100 % |
| Oszillation | `fan.oscillate` | Bereits vorhanden |
| Natural | Preset oder integrationsspezifischer Service | Vorhanden, Presets konfigurierbar |
| Schwenkbereich | `number.set_value`, Entität mit Suffix `_oscillation_angle` | Schreibbarer Schwenkbereich; keine nachgewiesene Live-Position |
| Links/Rechts | `fan.set_direction`, `reverse`/`forward` beim Default-Backend | Xiaomi-Miio-spezifische Kopfbewegung; nicht generisch für alle Fan-Integrationen verwendbar |
| Kindersicherung | Zusätzliche Switch-Entität | Mögliche spätere Erweiterung, abhängig von den angebotenen Entitäten |
| Timer | Zusätzliche Number-Entität | Mögliche spätere Erweiterung |
| LED | Number, Select oder Switch | Mögliche spätere Erweiterung |
| Temperatur, Feuchtigkeit, Netzversorgung | Zusätzliche Sensoren | Mögliche spätere Erweiterung |
| Schlafmodus | Modellabhängig, optional als 1-%-Geschwindigkeit simuliert | Nicht pauschal als echte Gerätefunktion voraussetzen |

Die Referenz findet zusätzliche Entitäten über die Entity Registry und gemeinsame `device_id`. Ihre Animation folgt dem Boolean `oscillating`; sie bildet keine gemessene Kopfposition ab. Die Tabelle beschreibt unterstützte Wege der Karte, keine Garantie für die Ausstattung eines bestimmten Lüfters.

## Winkel und Kopfposition

Die Referenz schreibt den Wert aus `getAngle()` mit `setAngle()` über die gleiche Number-Entität zurück. Ihr „Cycling“ bei Winkeln bedeutet das Durchschalten erlaubter Schwenkbereiche, kein Warten auf eine gemessene Kopfposition.

Im [python-miio-Treiber](https://github.com/rytilahti/python-miio/blob/master/miio/integrations/zhimi/fan/fan.py) ist `set_angle()` als Einstellen des Oszillationswinkels dokumentiert. `set_rotate()` bewegt dagegen um −5/+5 Grad. Die Formulierung „Current angle“ beim Getter bezeichnet allein den gelesenen `angle`-Wert; daraus folgt keine laufende Positionsmessung.

Die [Home-Assistant-Xiaomi-Miio-Implementierung](https://github.com/home-assistant/core/blob/dev/homeassistant/components/xiaomi_miio/fan.py) schaltet bei Richtungsbefehlen Oszillation aus und verwendet `set_rotate()`. Die [offizielle Xiaomi-Home-Integration](https://github.com/XiaoMi/ha_xiaomi_home/blob/main/custom_components/xiaomi_home/fan.py) bildet `set_direction()` dagegen auf `wind-reverse` ab. Der gleiche Fan-Service darf daher nicht ungeprüft als Schwenkbewegung behandelt werden.

## Konfigurierbare Zielwinkel-Steuerung

Unsere Karte bietet optional getrennte Eingaben für Schwenkbereich, echte Positionsrückmeldung und Zielwinkel. Sie startet mit maximalem Schwenkbereich und stoppt bei Zielnähe oder Überschreiten des Ziels. Verlorene Rückmeldung, Abbruch und Zeitlimit lösen einen Stop-Befehl aus. Netzwerk- und Geräteverzögerungen begrenzen die Genauigkeit. Eine echte Positionsentität beim Gerät des Nutzers ist noch nicht nachgewiesen.
