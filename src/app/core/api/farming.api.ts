import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { appSettings } from '../config';
import { Producer, ProducerFarmings } from '../models';

@Injectable({ providedIn: 'root' })
export class FarmingApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${appSettings.apiUrl}/admin/analysis`;

  producers() {
    return this.http.get<Producer[]>(`${this.url}/producer`);
  }

  byProducer(producerId: number) {
    return this.http
      .get<ProducerFarmings[]>(`${this.url}/farming/producer/`, { params: { id: producerId } })
      .pipe(map((list) => list[0] ?? null));
  }

  /** Lavouras aptas que se encaixam na cultura/safra de um grupo. */
  ableForCrop(cultureType: number, plantingYear: number, harvestYear: number) {
    return this.http.get<ProducerFarmings[]>(`${this.url}/farming`, {
      params: { plantingYear, harvestYear, cultureType },
    });
  }

  setAbleToCompare(farmingIds: number[], able: boolean) {
    return this.http.put<void>(`${this.url}/farming/${able ? 'activate' : 'deactivate'}`, farmingIds);
  }
}
