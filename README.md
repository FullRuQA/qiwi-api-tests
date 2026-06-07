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
│   └── qiwi-api.spec.js                                 # Автотесты на Playwright (14 тестов)
├── playwright.config.js                                 # Конфигурация Playwright + Allure
├── package.json                                         # Зависимости проекта
└── README.md                                            # Этот файл
```

## Что проверяется

### 1. Проверка доступности сервиса (4 теста)
- `GET /payment-history/v2/persons/{wallet}/payments` - формат ответа
- `GET /person-profile/v1/profile/current` - формат профиля
- Запрос без токена - ошибка авторизации
- Запрос с невалидным токеном - ошибка авторизации

### 2. Проверка баланса (3 теста)
- `GET /funding-sources/v2/persons/{wallet}/accounts` - баланс > 0
- Наличие всех обязательных полей (alias, currency, balance)
- Запрос без токена - ошибка авторизации

### 3. Создание платежа (4 теста)
- `POST /sinap/api/terms/99/payments` - создание платежа на 1 рубль
- Невалидная сумма (-1) - ошибка
- Без суммы - ошибка
- Без токена - ошибка

### 4. Исполнение платежа (3 теста)
- `GET /payment-history/v2/persons/{wallet}/payments/{id}` - статус платежа
- Валидация схемы истории платежей
- Несуществующий платеж - ошибка

## Запуск автотестов

### Установка зависимостей
```bash
cd qiwi-api-tests
npm install
```

### Запуск тестов
```bash
# Базовый запуск
npm test

# С токеном QIWI
QIWI_TOKEN=*** npm test

# С отображением браузера
npm run test:headed
```

### Allure-отчёт
```bash
# Запуск тестов
npm test

# Просмотр отчёта в браузере (запускает локальный сервер)
npm run allure:serve
# Откроется http://localhost:8080

# Или сгенерировать статический отчёт
npm run allure:generate
# Потом открыть allure-report/index.html в браузере
```

### CI/CD (GitHub Actions)

Тесты автоматически запускаются при каждом push в `main` и при pull request.

**Два параллельных джоба:**
1. **Playwright Tests** - запуск автотестов + Allure-отчёт
2. **Postman Collection (Newman)** - запуск Postman коллекции через CLI

Allure-отчёт публикуется в GitHub Pages после успешного прохождения.

**Настройка secrets (опционально):**
- `QIWI_TOKEN` - API-токен QIWI
- `QIWI_WALLET` - номер кошелька
- `QIWI_RECIPIENT` - номер получателя

**Включение GitHub Pages:**
1. Settings -> Pages -> Source: GitHub Actions
2. После первого деплоя отчёт будет доступен:
   `https://fullruqa.github.io/qiwi-api-tests/`

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
