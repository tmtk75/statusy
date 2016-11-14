list:
	kii-cli user list

clean:
	kii-cli user delete tmtk75

distclean:
	rm -rf statusy-darwin-x64

package: statusy-darwin-x64

tarball: statusy-darwin-x64.tar.gz

statusy-darwin-x64.tar.gz: statusy-darwin-x64
	tar cvfz statusy-darwin-x64.tar.gz statusy-darwin-x64

statusy-darwin-x64:
	./node_modules/.bin/electron-packager . statusy \
		--platform=darwin --arch=x64 \
		--version 1.3.8 \
		--overwrite \
		--prune \
		--icon=./dist/myicon.icns \
		--ignore src \
		--ignore .userData \
		--ignore .appData \
		--ignore credentials
