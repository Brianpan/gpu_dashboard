build:
	rm -rf public
	npm run build
	mkdir -p public
	cp -rp dist public
	cp -rp index.html public
	cp -rp data public
	cp -rp styles public