import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { appSettings } from '../config';
import { FarmingInGroup, Group, GroupRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class GroupsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${appSettings.apiUrl}/admin/group`;

  list() {
    return this.http.get<Group[]>(this.url);
  }

  create(body: GroupRequest) {
    return this.http.post<Pick<Group, 'id' | 'name' | 'status'>>(this.url, body);
  }

  update(groupId: number, body: GroupRequest) {
    return this.http.put<Group>(`${this.url}/${groupId}`, body);
  }

  remove(groupId: number) {
    return this.http.delete<void>(`${this.url}/${groupId}`);
  }

  farmings(groupId: number) {
    return this.http.get<FarmingInGroup[]>(`${this.url}/${groupId}`);
  }

  addFarming(groupId: number, farmingId: number) {
    return this.http.post<void>(`${this.url}/${groupId}/farming/${farmingId}`, null);
  }

  removeFarming(groupId: number, farmingId: number) {
    return this.http.delete<void>(`${this.url}/${groupId}/farming/${farmingId}`);
  }
}
