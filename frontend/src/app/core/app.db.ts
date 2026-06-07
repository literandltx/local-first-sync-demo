import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Label } from './label.model';

export interface SyncAction {
  id?: number;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;

  status?: 'PENDING' | 'ERROR';
  retries?: number;
  lastError?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppDB extends Dexie {
  labels!: Table<Label, string>;
  syncQueue!: Table<SyncAction, number>;

  constructor() {
    super('LocalFirstAppDB');

    this.version(2).stores({
      labels: 'uuid, name, color, createdAt, updatedAt',
      syncQueue: '++id, timestamp'
    });
  }
}
