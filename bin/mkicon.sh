#!/usr/bin/env bash
# http://stackoverflow.com/questions/12306223/how-to-manually-create-icns-files-using-iconutil
path=${1-dist/myicon}
src=${2-./assets/icon.png}

mkdir ${path}.iconset
sips -z 16 16    ${src} --out ${path}.iconset/icon_16x16.png
sips -z 32 32    ${src} --out ${path}.iconset/icon_16x16@2x.png
sips -z 32 32    ${src} --out ${path}.iconset/icon_32x32.png
sips -z 64 64    ${src} --out ${path}.iconset/icon_32x32@2x.png
sips -z 128 128  ${src} --out ${path}.iconset/icon_128x128.png
sips -z 256 256  ${src} --out ${path}.iconset/icon_128x128@2x.png
sips -z 256 256  ${src} --out ${path}.iconset/icon_256x256.png
sips -z 512 512  ${src} --out ${path}.iconset/icon_256x256@2x.png
sips -z 512 512  ${src} --out ${path}.iconset/icon_512x512.png
cp ${src} ${path}.iconset/icon_512x512@2x.png
iconutil -c icns ${path}.iconset
rm -r ${path}.iconset
