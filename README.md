# QIWI Wallet API Tests

Тестовое задание для МКК «Луна» (бренд Небус) - тестирование API QIWI Кошелька.

## Документация

https://developer.qiwi.com/ru/qiwi-wallet-personal/#intro

## Структура проекта

```
qiwi-api-tests/
├── postman/
│   ├── qiwi-wallet-api-tests.postman_collection.json    # Коллекция Postman
│   └── qiwi-wallet-api-tests.postman_environment.json   # Переменные окружения
├── tests/
│   └── qiwi-api.spec.js                                 # Автотесты на Playwright
├── playwright.config.js                                 # Конфигурация Playwright
├── package.json                                         # Зависимости проекта
└── README.md                                            # Этот файл
```

## Что проверяется

### 1. Проверка доступности сервиса
- `GET /payment-history/v2/persons/{wallet}/payments?rows=1`
- `GET /person-profile/v1/profile/current`
- Проверяется: HTTP статус, Content-Type: application/json, валидность JSON-структуры

### 2. Проверка баланса
- `GET /funding-sources/v2/persons/{wallet}/accounts`
- Ключевое условие: баланс всегда должен быть больше 0
- Проверяется: наличие массива accounts, наличие полей alias/currency/balance, balance.amount > 0

### 3. Создание платежа
- `POST /sinap/api/terms/99/payments`
- Сумма: 1 рубль (currency: 643)
- Проверяется: наличие полей id/sum/transaction в ответе, корректность суммы

### 4. Исполнение платежа
- `GET /payment-history/v2/persons/{wallet}/payments/{id}`
- Проверяется: наличие статуса платежа, допустимые значения статуса

## Запуск автотестов (Playwright)

### Установка зависимостей
```bash
cd qiwi-api-tests
npm install
npx playwright install
```

### Запуск тестов
```bash
# Базовый запуск
npm test

# С отображением браузера
npm run test:headed

# В режиме отладки
npm run test:debug
```

### Переменные окружения
```bash
QIWI_TOKEN=your_api_token QIWI_WALLET=79123456789 npm test
```

## Запуск коллекции Postman

1. Откройте Postman
2. Import -> выберите файл `postman/qiwi-wallet-api-tests.postman_collection.json`
3. Import -> выберите файл `postman/qiwi-wallet-api-tests.postman_environment.json`
4. Выберите environment "QIWI API - Test Environment" в правом верхнем углу
5. Замените `token` на ваш API-токен QIWI
6. Запустите коллекцию через Collection Runner

## Важно

Это не работающий сервис. Тесты не ожидают корректных ответов от API при запуске.
Цель - показать сценарии проверки и подход к тестированию на основе документации.
