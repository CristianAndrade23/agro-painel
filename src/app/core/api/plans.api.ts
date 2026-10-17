import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { appSettings } from '../config';
import { ContractedPlan } from '../models';

@Injectable({ providedIn: 'root' })
export class PlansApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${appSettings.apiUrl}/admin/plan`;

  list() {
    return this.http.get<ContractedPlan[]>(this.url);
  }

  toExpire() {
    return this.http.get<ContractedPlan[]>(`${this.url}/plans-to-expire`);
  }

  expired() {
    return this.http.get<ContractedPlan[]>(`${this.url}/expired-plans`);
  }

  setActive(planId: number, active: boolean) {
    return this.http.put<boolean>(`${this.url}/${planId}/${active ? 'activate' : 'deactivate'}`, null);
  }

  /** @param isoDate aaaa-mm-dd */
  updateEndDate(planId: number, isoDate: string) {
    return this.http.patch<string>(`${this.url}/${planId}/end-date/${isoDate}`, null);
  }
}
