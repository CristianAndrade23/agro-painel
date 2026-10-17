import { HttpClient, HttpErrorResponse, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { appSettings } from '../config';
import { Group, TokenResponse } from '../models';
import { mockApiInterceptor, resetMockDb } from './mock-api.interceptor';

const api = appSettings.apiUrl;

describe('mockApiInterceptor', () => {
  let http: HttpClient;
  let headers: HttpHeaders;

  beforeEach(async () => {
    resetMockDb();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockApiInterceptor]))],
    });
    http = TestBed.inject(HttpClient);

    const { username, password } = appSettings.demoCredentials;
    const { token } = await firstValueFrom(
      http.post<TokenResponse>(`${api}/authentication/signin`, { username, password, adm: true }),
    );
    headers = new HttpHeaders({ Authorization: token });
  });

  async function status(request: Promise<unknown>): Promise<number> {
    try {
      await request;
      return 200;
    } catch (e) {
      return (e as HttpErrorResponse).status;
    }
  }

  it('decodifica o usuário do token de demonstração', async () => {
    const user = await firstValueFrom(http.get(`${api}/authentication/decrypt`, { headers }));
    expect(user).toEqual({ clientId: 1, clientName: 'Administrador' });
  });

  it('recusa credenciais inválidas com 401', async () => {
    const result = status(
      firstValueFrom(http.post(`${api}/authentication/signin`, { username: 'x', password: 'y', adm: true })),
    );
    expect(await result).toBe(401);
  });

  it('exige autenticação nas rotas administrativas', async () => {
    expect(await status(firstValueFrom(http.get(`${api}/admin/plan`)))).toBe(401);
  });

  it('separa planos a vencer e vencidos', async () => {
    const all = await firstValueFrom(http.get<unknown[]>(`${api}/admin/plan`, { headers }));
    const toExpire = await firstValueFrom(http.get<unknown[]>(`${api}/admin/plan/plans-to-expire`, { headers }));
    const expired = await firstValueFrom(http.get<unknown[]>(`${api}/admin/plan/expired-plans`, { headers }));
    expect(all.length).toBeGreaterThan(0);
    expect(toExpire.length + expired.length).toBe(all.length);
  });

  it('cria grupo e impede nome duplicado', async () => {
    const body = { name: 'SOJA-SPEC', cultureType: 2, plantingYear: 2025, harvestYear: 2026 };
    await firstValueFrom(http.post(`${api}/admin/group`, body, { headers }));
    const groups = await firstValueFrom(http.get<Group[]>(`${api}/admin/group`, { headers }));
    expect(groups.some((g) => g.name === 'SOJA-SPEC' && g.cultureType === 'Soja')).toBe(true);
    expect(await status(firstValueFrom(http.post(`${api}/admin/group`, body, { headers })))).toBe(409);
  });

  it('restaura o seed com /demo/reset', async () => {
    const body = { name: 'TEMP', cultureType: 2, plantingYear: 2025, harvestYear: 2026 };
    await firstValueFrom(http.post(`${api}/admin/group`, body, { headers }));
    await firstValueFrom(http.post(`${api}/demo/reset`, null));
    const groups = await firstValueFrom(http.get<Group[]>(`${api}/admin/group`, { headers }));
    expect(groups.some((g) => g.name === 'TEMP')).toBe(false);
  });
});
