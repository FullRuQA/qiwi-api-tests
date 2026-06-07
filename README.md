# QIWI Wallet API Tests

Тестовое задание для МКК «Луна» (бренд Небус) - тестирование API QIWI Кошелька.

## Документация

https://developer.qiwi.com/ru/qiwi-wallet-personal/#intro

## Структура проекта

```
qiwi-api-tests/
├── postman/
│   ├── qiwi-wallet-api-tests.postman_collection.json    # Коллекция Postman (13 запросов)
│   └── qiwi-wallet-api-tests.postman_environment.json   # Переменные окружения
├── tests/
│   └── qiwi-api.spec.js                                 # Автотесты на Playwright (12 тестов)
├── playwright.config.js                                 # Конфигурация Playwright
├── package.json                                         # Зависимости проекта
└── README.md                                            # Этот файл
```

## Что проверяется

### 1. Проверка доступности сервиса (4 теста)
- `GET /payment-history/v2/persons/{wallet}/payments` - формат ответа
- `GET /person-profile/v1/profile/current` - формат профиля
- Запрос без токена - ожидаем 401
- Запрос с невалидным токеном - ожидаем 401

### 2. Проверка баланса (3 теста)
- `GET /funding-sources/v2/persons/{wallet}/accounts` - баланс > 0
- Наличие всех обязательных полей (alias, currency, balance)
- Запрос без токена - ожидаем 401

### 3. Создание платежа (4 теста)
- `POST /sinap/api/terms/99/payments` - создание платежа на 1 рубль
- Невалидная сумма (-1) - ожидаем ошибку
- Без суммы - ожидаем ошибку
- Без токена - ожидаем 401

### 4. Исполнение платежа (3 теста)
- `GET /payment-history/v2/persons/{wallet}/payments/{id}` - проверка статуса
- Валидация схемы истории платежей
- Несуществующий платеж - ожидаем 404

## Запуск автотестов (Playwright)

### Установка зависимостей
```bash
cd qiwi-api-tests
npm install
```

### Запуск тестов
```bash
# Базовый запуск (без токена - проверяет негативные сценарии)
npm test

# С токеном QIWI
QIWI_TOKEN=*** QIWI_WALLET=79123456789 npm test

# С отображением браузера
npm run test:headed

# В режиме отладки
npm run test:debug
```

### Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| QIWI_TOKEN | (пусто) | API-токен QIWI |
| QIWI_WALLET | 79123456789 | Номер кошелька |
| QIWI_RECIPIENT | 79999999999 | Номер получателя |
| QIWI_BASE_URL | https://edge.qiwi.com | Базовый URL API |

## Запуск коллекции Postman

1. Откройте Postman
2. Import -> `postman/qiwi-wallet-api-tests.postman_collection.json`
3. Import -> `postman/qiwi-wallet-api-tests.postman_environment.json`
4. Выберите environment "QIWI API - Test Environment"
5. Замените `token` на ваш API-токен QIWI
6. Запустите коллекцию через Collection Runner

## Важно

Это не работающий сервис. Тесты не ожидают корректных ответов от API.
Цель - показать сценарии проверки и подход к тестированию на основе документации.

Текущие результаты: тесты проверяют корректность HTTP-статусов,
формат ответа (JSON), наличие обязательных полей и бизнес-логику.
