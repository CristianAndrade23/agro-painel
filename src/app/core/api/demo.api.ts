import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { appSettings } from '../config';

@Injectable({ providedIn: 'root' })
export class DemoApi {
  private readonly http = inject(HttpClient);

  /** Restaura os dados de demonstração para o estado inicial (servidor ou navegador). */
  reset() {
    return this.http.post<void>(`${appSettings.apiUrl}/demo/reset`, null);
  }
}
