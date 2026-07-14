install:
	npm ci

page-loader:
	node bin/page-loader.js

# проверка команд
link:
	npm link

setup: install link

lint:
	npx eslint .

lint-fix:
	npx eslint . --fix

test:
	npm run test