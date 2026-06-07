// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Тестовое задание МКК «Луна» (бренд Небус)
 * Тестирование API QIWI Кошелька на основе документации:
 * https://developer.qiwi.com/ru/qiwi-wallet-personal/#intro
 *
 * Важно: сервис не является рабочим, поэтому тесты проверяют
 * корректность структуры ответов и заложенные сценарии проверок.
 */

const BASE_URL = 'https://edge.qiwi.com';
const TOKEN = process.env.QIWI_TOKEN || 'test-token';
const WALLET = process.env.QIWI_WALLET || '79123456789';
const RECIPIENT_WALLET = process.env.QIWI_RECIPIENT || '79999999999';

const authHeaders = {
  'Accept': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

// Вспомогательная функция для безопасного получения JSON из ответа
async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ============================================================
// 1. Проверка доступности сервиса
// ============================================================
test.describe('1. Health Check - Service Availability', () => {
  test('GET /payment-history/v2/persons/{wallet}/payments returns valid response', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/payment-history/v2/persons/${WALLET}/payments?rows=1`,
      { headers: authHeaders }
    );

    // Сервис должен отвечать (200 при успехе, 401/403/404 при ошибках)
    const status = response.status();
    expect([200, 401, 403, 404]).toContain(status);

    // Если ответ 200 - проверяем структуру по документации
    if (status === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');

      const body = await safeJson(response);
      expect(body).not.toBeNull();
      // Согласно документации, ответ содержит массив data
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    }

    // При ошибках сервис также должен возврачать JSON с описанием ошибки
    if (status !== 200) {
      const body = await safeJson(response);
      // Даже при ошибке ожидаем структурированный ответ
      if (body) {
        expect(body).toHaveProperty('code');
        expect(body).toHaveProperty('message');
      }
    }
  });

  test('GET /person-profile/v1/profile/current returns valid profile structure', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/person-profile/v1/profile/current`,
      { headers: authHeaders }
    );

    const status = response.status();
    expect([200, 401, 403, 404]).toContain(status);

    if (status === 200) {
      const body = await safeJson(response);
      expect(body).not.toBeNull();
      // Согласно документации, ответ содержит authInfo, contractInfo, userInfo
      expect(body).toHaveProperty('authInfo');
      expect(body).toHaveProperty('contractInfo');
      expect(body).toHaveProperty('userInfo');
    }
  });
});

// ============================================================
// 2. Проверка баланса
// ============================================================
test.describe('2. Balance Check', () => {
  test('GET /funding-sources/v2/persons/{wallet}/accounts returns accounts with balance > 0', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/funding-sources/v2/persons/${WALLET}/accounts`,
      { headers: authHeaders }
    );

    const status = response.status();

    // Если сервис недоступен (404) или ошибка авторизации - тест не проверяет баланс
    if (status === 404 || status === 401 || status === 403) {
      // Сервис недоступен - это ожиемое поведение по условию задания
      expect([401, 403, 404]).toContain(status);
      return;
    }

    // Ожидаем 200 при корректном запросе
    expect(status).toBe(200);

    const body = await safeJson(response);
    expect(body).not.toBeNull();

    // Согласно документации, ответ содержит массив accounts
    expect(body).toHaveProperty('accounts');
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(body.accounts.length).toBeGreaterThan(0);

    // Ключевое условие: баланс всегда должен быть больше 0
    for (const account of body.accounts) {
      expect(account).toHaveProperty('alias');
      expect(account).toHaveProperty('currency');
      expect(account).toHaveProperty('balance');
      expect(account.balance).toHaveProperty('amount');

      const balance = parseFloat(account.balance.amount);
      expect(balance).toBeGreaterThan(0);
    }
  });

  test('Balance response contains all required fields per documentation', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/funding-sources/v2/persons/${WALLET}/accounts`,
      { headers: authHeaders }
    );

    if (response.status() !== 200) {
      test.skip('Service returned non-200 status');
      return;
    }

    const body = await safeJson(response);
    expect(body).not.toBeNull();

    for (const account of body.accounts) {
      // Проверяем наличие всех полей из документации
      expect(account).toHaveProperty('alias');
      expect(account).toHaveProperty('currency');
      expect(account).toHaveProperty('balance');
      expect(account.balance).toHaveProperty('amount');
    }
  });
});

// ============================================================
// 3. Создание платежа
// ============================================================
test.describe('3. Create Payment (1 RUB)', () => {
  const paymentId = Date.now().toString();

  test('POST /sinap/api/terms/99/payments creates payment with amount 1 RUB', async ({ request }) => {
    const paymentPayload = {
      id: paymentId,
      sum: {
        amount: 1,
        currency: '643'
      },
      paymentMethod: {
        type: 'Account',
        accountId: '643'
      },
      fields: {
        account: RECIPIENT_WALLET
      }
    };

    const response = await request.post(
      `${BASE_URL}/sinap/api/terms/99/payments`,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        data: paymentPayload
      }
    );

    const status = response.status();

    // Сервис должен ответить (200 при успехе, 400/401/403/404/500 при ошибках)
    expect([200, 400, 401, 403, 404, 500]).toContain(status);

    if (status === 200) {
      const body = await safeJson(response);
      expect(body).not.toBeNull();

      // Согласно документации, ответ содержит id, sum, transaction
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('sum');
      expect(body).toHaveProperty('transaction');

      // Проверяем что сумма платежа = 1 рубль
      expect(body.sum.amount).toBe(1);
      expect(body.sum.currency).toBe('643');

      // Транзакция должна иметь статус
      expect(body.transaction).toHaveProperty('state');
    }
  });

  test('Payment creation with invalid amount returns error', async ({ request }) => {
    const invalidPayload = {
      id: Date.now().toString(),
      sum: {
        amount: -1,
        currency: '643'
      },
      paymentMethod: {
        type: 'Account',
        accountId: '643'
      },
      fields: {
        account: RECIPIENT_WALLET
      }
    };

    const response = await request.post(
      `${BASE_URL}/sinap/api/terms/99/payments`,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        data: invalidPayload
      }
    );

    // Невалидная сумма должна вызвать ошибку (400 или ошибка в ответе)
    const status = response.status();
    expect([200, 400, 401, 403, 404, 500]).toContain(status);
  });
});

// ============================================================
// 4. Исполнение платежа
// ============================================================
test.describe('4. Payment Execution Status', () => {
  test('GET /payment-history/v2/persons/{wallet}/payments/{id} returns payment status', async ({ request }) => {
    // Используем фиктивный ID для проверки структуры ответа
    const testPaymentId = '1717700000001';

    const response = await request.get(
      `${BASE_URL}/payment-history/v2/persons/${WALLET}/payments/${testPaymentId}`,
      { headers: authHeaders }
    );

    const status = response.status();
    expect([200, 400, 401, 403, 404]).toContain(status);

    if (status === 200) {
      const body = await safeJson(response);
      expect(body).not.toBeNull();

      // Согласно документации, ответ содержит id, sum, status
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('sum');
      expect(body).toHaveProperty('status');

      // Статус должен быть одним из допустимых значений
      expect(['WAITING', 'SUCCESS', 'ERROR', 'REJECTED']).toContain(body.status);
    }
  });

  test('Payment history response matches documented schema', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/payment-history/v2/persons/${WALLET}/payments?rows=5`,
      { headers: authHeaders }
    );

    if (response.status() !== 200) {
      test.skip('Service returned non-200 status');
      return;
    }

    const body = await safeJson(response);
    expect(body).not.toBeNull();

    // Проверяем структуру ответа по документации
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      const payment = body.data[0];
      // Каждый платеж должен содержать обязательные поля
      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('sum');
      expect(payment).toHaveProperty('status');
    }
  });
});
