install:
	npm ci

# проверка команд
link:
	npm link

lint:
	npx eslint .

lint-fix:
	npx eslint . --fix

test:
	npm run test