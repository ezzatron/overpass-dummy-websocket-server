serve: node_modules
	PORT=8081 node --harmony --require babel-register src/app

.PHONY: serve

node_modules:
	npm install
