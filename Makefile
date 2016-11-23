archive: statusy-darwin-x64.tar.gz

statusy-darwin-x64.tar.gz: statusy-darwin-x64
	tar cvfz statusy-darwin-x64.tar.gz statusy-darwin-x64

statusy-darwin-x64: ./dist/bundle.js ./dist/myicon.icns
	./node_modules/.bin/electron-packager . statusy \
		--platform=darwin --arch=x64 \
		--version 1.4.8 \
		--overwrite \
		--prune \
		--icon=./dist/myicon.icns \
		--ignore src \
		--ignore .userData \
		--ignore .appData \
		--ignore statusy-darwin-x64.tar.gz \
		--ignore credentials

./dist/bundle.js:
	npm run build

./dist/myicon.icns:
	npm run mkicon

version := `jq -r .version package.json`
upload: statusy-darwin-x64.tar.gz
	  ghr -u tmtk75 --prerelease "v$(version)" statusy-darwin-x64.tar.gz
	  #ghr -u tmtk75 "v$(version)" statusy-darwin-x64.tar.gz

distclean:
	rm -rf dist statusy-darwin-x64 statusy-darwin-x64.tar.gz
