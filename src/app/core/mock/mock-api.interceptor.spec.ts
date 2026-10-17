import { HttpClient, HttpErrorResponse, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { appSettings } from '../config';
import { Group, TokenResponse } from '../models';
import { mockApiInterceptor, resetMockDb } from './mock-api.interceptor';
import { clearState } from './mock-db';

const api = appSettings.apiUrl;

describe('mockApiInterceptor', () => {
  let http: HttpClient;

  beforeEach(() => {
    clearState();
    resetMockDb();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockApiInterceptor]))],
    });
    http = TestBed.inject(HttpClient);
  });

  async function status(request: Promise<unknown>): Promise<number> {
    try {
      await request;
      return 200;
    } catch (e) {
      return (e as HttpErrorResponse).status;
    }
  }

  it('autentica com as credenciais de demonstração', async () => {
    const { username, password } = appSettings.demoCredentials;
    const { token } = await firstValueFrom(
      http.post<TokenResponse>(`${api}/authentication/signin`, { username, password, adm: true }),
    );
    const user = await firstValueFrom(
      http.get(`${api}/authentication/decrypt`, { headers: new HttpHeaders({ Authorization: token }) }),
    );
    expect(user).toEqual({ clientId: 1, clientName: 'Administrador' });
  });

  it('recusa credenciais inválidas com 401', async () => {
    const result = status(
      firstValueFrom(http.post(`${api}/authentication/signin`, { username: 'x', password: 'y', adm: true })),
    );
    expect(await result).toBe(401);
  });

  it('separa planos a vencer e vencidos', async () => {
    const all = await firstValueFrom(http.get<unknown[]>(`${api}/admin/plan`));
    const toExpire = await firstValueFrom(http.get<unknown[]>(`${api}/admin/plan/plans-to-expire`));
    const expired = await firstValueFrom(http.get<unknown[]>(`${api}/admin/plan/expired-plans`));
    expect(all.length).toBeGreaterThan(0);
    expect(toExpire.length + expired.length).toBe(all.length);
  });

  it('cria grupo e impede nome duplicado', async () => {
    const body = { name: 'SOJA-SPEC', cultureType: 2, plantingYear: 2025, harvestYear: 2026 };
    await firstValueFrom(http.post(`${api}/admin/group`, body));
    const groups = await firstValueFrom(http.get<Group[]>(`${api}/admin/group`));
    expect(groups.some((g) => g.name === 'SOJA-SPEC' && g.cultureType === 'Soja')).toBe(true);
    expect(await status(firstValueFrom(http.post(`${api}/admin/group`, body)))).toBe(409);
  });

  it('não exclui grupo que ainda tem lavouras', async () => {
    const groups = await firstValueFrom(http.get<Group[]>(`${api}/admin/group`));
    const withFarmings = [];
    for (const g of groups) {
      const farmings = await firstValueFrom(http.get<unknown[]>(`${api}/admin/group/${g.id}`));
      if (farmings.length) withFarmings.push(g);
    }
    expect(withFarmings.length).toBeGreaterThan(0);
    expect(await status(firstValueFrom(http.delete(`${api}/admin/group/${withFarmings[0].id}`)))).toBe(409);
  });
});
