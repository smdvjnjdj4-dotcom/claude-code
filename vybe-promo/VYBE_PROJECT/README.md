# VYBE – Official Promo (61 s, 9:16, 60 fps)

Alles hier ist mit kostenlosen Werkzeugen erzeugt: Chromium/Playwright, FFmpeg, Python/NumPy und Open-Source-Schriften. Es gibt keine Stockvideos, keine fremde Musik und keine kostenpflichtigen Dienste.

## Dateien
- `../VYBE_OFFICIAL_PROMO_61S.mp4`: der fertige Film (1080×1920, 60 fps, H.264 High, AAC 48 kHz)
- `VYBE_SUBTITLES.srt`: die Untertitel; dieselben Texte sind auch ins Bild eingebrannt
- `VYBE_SPRECHERSKRIPT.txt`: der Erzähltext mit Zeiten
- `VYBE_SOUNDTRACK.wav`: Musik und Sounddesign, selbst synthetisiert mit `../audio.py`
- `../stage.html`: die Szene; `render(t)` zeichnet jeden Zeitpunkt deterministisch
- `../render.cjs`: der Frame-Renderer; `../capture-screens.cjs` nimmt echte VYBE-Screens auf; `../assets/`: Screens und Logo

## Neu rendern
    node render.cjs 0 61 60 frames 4        # ca. 12 min bei 4 Kernen
    ffmpeg -framerate 60 -i frames/f%05d.jpg -i VYBE_PROJECT/VYBE_SOUNDTRACK.wav -t 61 \
      -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k VYBE_OFFICIAL_PROMO_61S.mp4

## Eigene Stimme hinzufügen
Nimm das Skript auf (`voice.wav`, 48 kHz) und mische sie über die Musik. Die Musik wird dabei automatisch leiser, solange gesprochen wird:

    ffmpeg -i VYBE_OFFICIAL_PROMO_61S.mp4 -i voice.wav -filter_complex \
      "[0:a][1:a]sidechaincompress=threshold=0.05:ratio=6[m];[m][1:a]amix=inputs=2:weights=1 1.6[a]" \
      -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k VYBE_PROMO_MIT_STIMME.mp4
