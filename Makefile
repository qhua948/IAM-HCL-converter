@phony: all

all: npmi
	node_modules/typescript/bin/tsc main.ts --esModuleInterop
	mkdir -p dist/
	cp main.js dist/

npmi:
	npm i

