#!/usr/bin/env bash
# Prepara un clip de vídeo para la web: recorta el fragmento, quita el audio, recorta a la proporción pedida
# (sin deformar, sin barras negras), reduce el tamaño y genera el póster. Requiere ffmpeg.
#
#   scripts/prepare-media.sh <entrada.mp4> <destino> <inicio> <duración> [proporción] [ancho]
#
#   destino     sala | exterior            → src/Assets/Video/entrenamiento/<destino>.mp4  (+ póster en Images/entrenamiento)
#               o una ruta de carpeta       → <carpeta>/<nombre-de-entrada>.mp4 (+ -poster.jpg)
#   inicio      segundo de inicio del fragmento (p. ej. 3.5)
#   duración    3–5 s recomendado
#   proporción  16:10 (por defecto) · 4:5 · 16:9 · 1:1
#   ancho       ancho final en px (por defecto 720; 540 para 4:5)
#
# Ejemplos (los nombres de archivo son los de tu material):
#   scripts/prepare-media.sh A5F277F6-983D-4523-A8BE-F5099C158369.mp4 sala 2 4
#   scripts/prepare-media.sh C0CC46CA-F502-4202-AABA-F42D29C7E26A.mp4 exterior 1 4
#   scripts/prepare-media.sh 35cdd54a3dab4760972d85e150bef337.mp4 src/Assets/Video/eci 5 4.5 4:5 540
set -euo pipefail
IN="${1:?entrada}"; DEST="${2:?destino}"; SS="${3:?inicio}"; DUR="${4:?duración}"; RATIO="${5:-16:10}"; W="${6:-720}"
W_R="${RATIO%%:*}"; H_R="${RATIO##*:}"
H=$(( W * H_R / W_R / 2 * 2 ))
case "$DEST" in
  sala|exterior) VDIR="src/Assets/Video/entrenamiento"; IDIR="src/Assets/Images/entrenamiento"; NAME="$DEST";;
  *) VDIR="$DEST"; IDIR="$DEST"; NAME="$(basename "${IN%.*}")";;
esac
mkdir -p "$VDIR" "$IDIR"
VF="crop='if(gt(iw/ih,$W_R/$H_R),ih*$W_R/$H_R,iw)':'if(gt(iw/ih,$W_R/$H_R),ih,iw*$H_R/$W_R)',scale=$W:$H:flags=lanczos,fps=24,format=yuv420p"
ffmpeg -y -loglevel error -ss "$SS" -t "$DUR" -i "$IN" -an -vf "$VF" \
  -c:v libx264 -profile:v main -preset slow -crf 28 -movflags +faststart "$VDIR/$NAME.mp4"
ffmpeg -y -loglevel error -ss 0.4 -i "$VDIR/$NAME.mp4" -frames:v 1 -q:v 4 "$IDIR/$NAME-poster.jpg"
echo "OK  $VDIR/$NAME.mp4 ($(du -h "$VDIR/$NAME.mp4" | cut -f1))  +  $IDIR/$NAME-poster.jpg"
