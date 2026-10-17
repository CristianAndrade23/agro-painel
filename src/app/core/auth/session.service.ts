import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';
import { appSettings } from '../config';
import { SignInRequest, TokenResponse, UserInfo } from '../models';

const TOKEN_KEY = 'agro-painel:token';
const USER_KEY = 'agro-painel:user';

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sessão fica só em memória */
  }
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = appSettings.apiUrl;

  private readonly _token = signal<string | null>(readStorage<string>(TOKEN_KEY));
  private readonly _user = signal<UserInfo | null>(readStorage<UserInfo>(USER_KEY));

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._token() !== null);

  /** Autentica, decodifica o usuário do token e valida a sessão — mesmo fluxo do backend original. */
  login(username: string, password: string): Observable<boolean> {
    const body: SignInRequest = { username, password, adm: true };
    return this.http.post<TokenResponse>(`${this.api}/authentication/signin`, body).pipe(
      switchMap(({ token }) => {
        const headers = new HttpHeaders({ Authorization: token });
        return this.http.get<UserInfo>(`${this.api}/authentication/decrypt`, { headers }).pipe(
          tap((user) => this.store(token, user)),
          switchMap(() => this.http.get<boolean>(`${this.api}/authentication/validate`, { headers })),
        );
      }),
    );
  }

  logout(): void {
    this.store(null, null);
    this.router.navigate(['/login']);
  }

  private store(token: string | null, user: UserInfo | null) {
    this._token.set(token);
    this._user.set(user);
    writeStorage(TOKEN_KEY, token);
    writeStorage(USER_KEY, user);
  }
}
