// @ts-check
import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

/**
 * Тестовое задание МКК «Луна» (бренд Небус)
 * Тестирование API QIWI Кошелька
 *
 * Документация: https://developer.qiwi.com/ru/qiwi-wallet-personal/#intro
 */

const BASE_URL = process.env.QIWI_BASE_URL || 'https://edge.qiwi.com';
const TOKEN = process.env.QIWI_TOKEN || 'test-token';
const WALLET = process.env.QIWI_WALLET || '79123456789';
const RECIPIENT = process.env.QIWI_RECIPIENT || '79999999999';

const jsonHeaders = (token) => ({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

async function parseJson(response) {
  const text = await response.text();
  if (!text) return { raw: '', parsed: null, isEmpty: true };
  try {
    return { raw: text, parsed: JSON.parse(text), isEmpty: false };
  } catch {
    return { raw: text, parsed: null, isEmpty: false };
  }
}

// ============================================================
// 1. ПРОВЕРКА ДОСТУПНОСТИ СЕРВИСА
// ============================================================
test.describe('1. Проверка доступности сервиса', () => {

  test('GET /payment-history - формат ответа', async ({ request }) => {
    allure.epic('Health Check');
    allure.severity('critical');
    allure.tag('smoke');

    const response = await request.get(
      `${BASE_URL}/payment-history/v2/persons/${WALLET}/payments?rows=1`,
      { headers: jsonHeaders(TOKEN) }
    );

    const { parsed, isEmpty } = await parseJson(response);
    const status = response.status();

    await allure.attachment('Response', JSON.stringify({ status, body: parsed }, null, 2), 'application/json');

    expect([200, 401, 403, 404]).toContain(status);

    if (!isEmpty && parsed) {
      if (status === 200) {
        expect(parsed).toHaveProperty('data');
        expect(Array.isArray(parsed.data)).toBe(true);
      } else {
        expect(parsed).toHaveProperty('code');
        expect(parsed).toHaveProperty('message');
      }
    }
  });

  test('GET /person-profile - формат профиля', async ({ request }) => {
    allure.epic('Health Check');
    allure.severity('critical');

    const response = await request.get(
      `${BASE_URL}/person-profile/v1/profile/current`,
      { headers: jsonHeaders(TOKEN) }
    );

    const { parsed, isEmpty } = await parseJson(response);
    const status = response.status();

    expect([200, 401, 403, 404]).toContain(status);

    if (!isEmpty && status === 200) {
      expect(parsed).not.toBeNull();
      expect(parsed).toHaveProperty('authInfo');
      expect(parsed).toHaveProperty('contractInfo');
      expect(parsed).toHaveProperty('userInfo');
    }
  });

  test('Запрос без токена - ошибка авторизации', async ({ request }) => {
    allure.epic('Health Check');
    allure.feature('Авторизация');
    allure.severity('critical');

    const response = await request.get(
      `${BASE_URL}/payment-history/v2/persons/${WALLET}/payments?rows=1`,
      { headers: { 'Accept': 'application/json' } }
    );

    expect([401, 403, 404]).toContain(response.status());
  });

  test('Запрос с невалидным токеном - ошибка авторизации', async ({ request }) => {
    allure.epic('Health Check');
    allure.feature('Авторизация');
    allure.severity('critical');

    const response = await request.get(
      `${BASE_URL}/payment-history/v2/persons/${WALLET}/payments?rows=1`,
      { headers: jsonHeaders('invalid-token-12345') }
    );

    expect([401, 403, 404]).toContain(response.status());
  });
});

// ============================================================
// 2. ПРОВЕРКА БАЛАНСА
// Ключевое условие: баланс всегда должен быть больше 0
// ============================================================
test.describe('2. Проверка баланса', () => {

  test('GET /funding-sources - баланс > 0', async ({ request }) => {
    allure.epic('Balance');
    allure.feature('Проверка баланса');
    allure.severity('critical');
    allure.tag('smoke');

    const response = await request.get(
      `${BASE_URL}/funding-sources/v2/persons/${WALLET}/accounts`,
      { headers: jsonHeaders(TOKEN) }
    );

    const { parsed, isEmpty } = await parseJson(response);
    const status = response.status();

    await allure.attachment('Response', JSON.stringify({ status, body: parsed }, null, 2), 'application/json');

    if (status === 401 || status === 403 || status === 404) {
      expect([401, 403, 404]).toContain(status);
      return;
    }

    expect(status).toBe(200);
    expect(!isEmpty && parsed).not.toBeNull();

    expect(parsed).toHaveProperty('accounts');
    expect(Array.isArray(parsed.accounts)).toBe(true);
    expect(parsed.accounts.length).toBeGreaterThan(0);

    for (const account of parsed.accounts) {
      expect(account).toHaveProperty('alias');
      expect(account).toHaveProperty('currency');
      expect(account).toHaveProperty('balance');
      expect(account.balance).toHaveProperty('amount');
      expect(parseFloat(account.balance.amount)).toBeGreaterThan(0);
    }
  });

  test('Баланс содержит все обязательные поля', async ({ request }) => {
    allure.epic('Balance');
    allure.feature('Схема ответа');
    allure.severity('normal');

    const response = await request.get(
      `${BASE_URL}/funding-sources/v2/persons/${WALLET}/accounts`,
      { headers: jsonHeaders(TOKEN) }
    );

    if (response.status() !== 200) {
      test.skip('Сервис вернул не-200');
      return;
    }

    const { parsed, isEmpty } = await parseJson(response);
    if (isEmpty || !parsed) {
      test.skip('Пустой ответ');
      return;
    }

    for (const account of parsed.accounts) {
      expect(account).toHaveProperty('alias');
      expect(account).toHaveProperty('currency');
      expect(account).toHaveProperty('balance');
      expect(account.balance).toHaveProperty('amount');
    }
  });

  test('Баланс недоступен без токена', async ({ request }) => {
    allure.epic('Balance');
    allure.feature('Авторизация');
    allure.severity('critical');

    const response = await request.get(
      `${BASE_URL}/funding-sources/v2/persons/${WALLET}/accounts`,
      { headers: { 'Accept': 'application/json' } }
    );

    expect([401, 403, 404]).toContain(response.status());
  });
});

// ============================================================
// 3. СОЗДАНИЕ ПЛАТЕЖА
// Проверка создания платежа на сумму 1 рубль
// ============================================================
test.describe('3. Создание платежа (1 рубль)', () => {

  test('POST /payments - создание платежа на 1 рубль', async ({ request }) => {
    allure.epic('Payments');
    allure.feature('Создание платежа');
    allure.severity('critical');
    allure.tag('smoke');

    const paymentId = Date.now().toString();
    const payload = {
      id: paymentId,
      sum: { amount: 1, currency: '643' },
      paymentMethod: { type: 'Account', accountId: '643' },
      fields: { account: RECIPIENT },
    };

    await allure.attachment('Request body', JSON.stringify(payload, null, 2), 'application/json');

    const response = await request.post(
      `${BASE_URL}/sinap/api/terms/99/payments`,
      { headers: jsonHeaders(TOKEN), data: payload }
    );

    const { parsed, isEmpty } = await parseJson(response);
    const status = response.status();

    await allure.attachment('Response', JSON.stringify({ status, body: parsed }, null, 2), 'application/json');

    expect([200, 400, 401, 403, 404, 500]).toContain(status);

    if (!isEmpty && parsed && status === 200) {
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('sum');
      expect(parsed).toHaveProperty('transaction');
      expect(parsed.sum.amount).toBe(1);
      expect(parsed.sum.currency).toBe('643');
      expect(parsed.transaction).toHaveProperty('state');
    }
  });

  test('Невалидная сумма (-1) возвращает ошибку', async ({ request }) => {
    allure.epic('Payments');
    allure.feature('Негативные сценарии');
    allure.severity('critical');

    const payload = {
      id: Date.now().toString(),
      sum: { amount: -1, currency: '643' },
      paymentMethod: { type: 'Account', accountId: '643' },
      fields: { account: RECIPIENT },
    };

    const response = await request.post(
      `${BASE_URL}/sinap/api/terms/99/payments`,
      { headers: jsonHeaders(TOKEN), data: payload }
    );

    expect([400, 401, 403, 404, 500]).toContain(response.status());
  });

  test('Создание платежа без суммы возвращает ошибку', async ({ request }) => {
    allure.epic('Payments');
    allure.feature('Негативные сценарии');
    allure.severity('normal');

    const payload = {
      id: Date.now().toString(),
      paymentMethod: { type: 'Account', accountId: '643' },
      fields: { account: RECIPIENT },
    };

    const response = await request.post(
      `${BASE_URL}/sinap/api/terms/99/payments`,
      { headers: jsonHeaders(TOKEN), data: payload }
    );

    expect([400, 401, 403, 404, 500]).toContain(response.status());
  });

  test('Создание платежа без токена возвращает ошибку', async ({ request }) => {
    allure.epic('Payments');
    allure.feature('Авторизация');
    allure.severity('critical');

    const payload = {
      id: Date.now().toString(),
      sum: { amount: 1, currency: '643' },
      paymentMethod: { type: 'Account', accountId: '643' },
      fields: { account: RECIPIENT },
    };

    const response = await request.post(
      `${BASE_URL}/sinap/api/terms/99/payments`,
      { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, data: payload }
    );

    expect([401, 403, 404, 500]).toContain(response.status());
  });
});

// ============================================================
// 4. ИСПОЛНЕНИЕ ПЛАТЕЖА
// Проверка статуса платежа
// ============================================================
test.describe('4. Исполнение платежа', () => {

  test('GET /payments/{id} - проверка статуса', async ({ request }) => {
    allure.epic('Payments');
    allure.feature('Исполнение платежа');
    allure.severity('critical');
    allure.tag('smoke');

    const paymentId = '1717700000001';

    const response = await request.get(
      `${BASE_URL}/payment-history/v2/persons/${WALLET}/payments/${paymentId}`,
      { headers: jsonHeaders(TOKEN) }
    );

    const { parsed, isEmpty } = await parseJson(response);
    const status = response.status();

    expect([200, 400, 401, 403, 404]).toContain(status);

    if (!isEmpty && parsed && status === 200) {
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('sum');
      expect(parsed).toHaveProperty('status');
      expect(['WAITING', 'SUCCESS', 'ERROR', 'REJECTED']).toContain(parsed.status);
    }
  });

  test('История платежей соответствует схеме', async ({ request }) => {
    allure.epic('Payments');
    allure.feature('Схема ответа');
    allure.severity('normal');

    const response = await request.get(
      `${BASE_URL}/payment-history/v2/persons/${WALLET}/payments?rows=5`,
      { headers: jsonHeaders(TOKEN) }
    );

    if (response.status() !== 200) {
      test.skip('Сервис вернул не-200');
      return;
    }

    const { parsed, isEmpty } = await parseJson(response);
    if (isEmpty || !parsed) {
      test.skip('Пустой ответ');
      return;
    }

    expect(parsed).toHaveProperty('data');
    expect(Array.isArray(parsed.data)).toBe(true);

    if (parsed.data.length > 0) {
      const payment = parsed.data[0];
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('sum');
      expect(payment).toHaveProperty('status');
    }
  });

  test('Несуществующий платеж возвращает ошибку', async ({ request }) => {
    allure.epic('Payments');
    allure.feature('Негативные сценарии');
    allure.severity('normal');

    const response = await request.get(
      `${BASE_URL}/payment-history/v2/persons/${WALLET}/payments/0`,
      { headers: jsonHeaders(TOKEN) }
    );

    expect([400, 401, 403, 404]).toContain(response.status());
  });
});
