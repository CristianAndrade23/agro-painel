import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'node:test';
import { createApp } from '../src/app.ts';

let baseUrl = '';
let close: () => void;
let token = '';

async function call(method: string, path: string, options: { body?: unknown; auth?: boolean } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false) headers['Authorization'] = token;
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  const server = createApp({ jwtSecret: 'test-secret' }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();

  const res = await call('POST', '/authentication/signin', {
    auth: false,
    body: { username: 'admin', password: 'admin123', adm: true },
  });
  token = res.body.token;
});

after(() => close());

beforeEach(async () => {
  await call('POST', '/demo/reset', { auth: false });
});

describe('autenticação', () => {
  it('emite um JWT com prefixo Bearer', () => {
    assert.match(token, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it('recusa credenciais inválidas', async () => {
    const res = await call('POST', '/authentication/signin', {
      auth: false,
      body: { username: 'admin', password: 'errada' },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Credenciais inválidas');
  });

  it('decodifica o usuário do token', async () => {
    const res = await call('GET', '/authentication/decrypt');
    assert.deepEqual(res.body, { clientId: 1, clientName: 'Administrador' });
  });

  it('protege as rotas administrativas', async () => {
    assert.equal((await call('GET', '/admin/plan', { auth: false })).status, 401);

    // Assinatura adulterada: o JWT deve ser rejeitado.
    const tampered = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    const res = await fetch(`${baseUrl}/api/v1/admin/plan`, { headers: { Authorization: tampered } });
    assert.equal(res.status, 401);
  });
});

describe('planos', () => {
  it('separa planos a vencer e vencidos', async () => {
    const all = await call('GET', '/admin/plan');
    const toExpire = await call('GET', '/admin/plan/plans-to-expire');
    const expired = await call('GET', '/admin/plan/expired-plans');
    assert.ok(all.body.length > 0);
    assert.equal(toExpire.body.length + expired.body.length, all.body.length);
  });

  it('ativa e desativa um plano', async () => {
    const [plan] = (await call('GET', '/admin/plan')).body;
    const res = await call('PUT', `/admin/plan/${plan.id}/${plan.isActive ? 'deactivate' : 'activate'}`);
    assert.equal(res.body, !plan.isActive);
  });

  it('rejeita vencimento anterior ao início', async () => {
    const [plan] = (await call('GET', '/admin/plan')).body;
    assert.equal((await call('PATCH', `/admin/plan/${plan.id}/end-date/2000-01-01`)).status, 400);
  });
});

describe('grupos', () => {
  const group = { name: 'SOJA-API', cultureType: 2, plantingYear: 2025, harvestYear: 2026 };

  it('cria grupo e impede nome duplicado', async () => {
    assert.equal((await call('POST', '/admin/group', { body: group })).status, 200);
    assert.equal((await call('POST', '/admin/group', { body: { ...group, name: 'soja-api' } })).status, 409);
  });

  it('valida nome e safra', async () => {
    assert.equal((await call('POST', '/admin/group', { body: { ...group, name: 'com espaço' } })).status, 400);
    assert.equal((await call('POST', '/admin/group', { body: { ...group, harvestYear: 2020 } })).status, 400);
  });

  it('não exclui grupo com lavouras vinculadas', async () => {
    const groups = (await call('GET', '/admin/group')).body as { id: number }[];
    for (const g of groups) {
      if ((await call('GET', `/admin/group/${g.id}`)).body.length > 0) {
        assert.equal((await call('DELETE', `/admin/group/${g.id}`)).status, 409);
        return;
      }
    }
    assert.fail('o seed deveria ter um grupo com lavouras');
  });

  it('restaura o seed com /demo/reset', async () => {
    await call('POST', '/admin/group', { body: group });
    await call('POST', '/demo/reset', { auth: false });
    const groups = (await call('GET', '/admin/group')).body as { name: string }[];
    assert.ok(!groups.some((g) => g.name === group.name));
  });
});

describe('erros', () => {
  it('responde 404 em JSON para rotas inexistentes', async () => {
    const res = await call('GET', '/nao-existe');
    assert.equal(res.status, 404);
    assert.equal(res.body.message, 'Recurso não encontrado.');
  });

  it('responde 400 para JSON malformado', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: '{ inválido',
    });
    assert.equal(res.status, 400);
  });
});
