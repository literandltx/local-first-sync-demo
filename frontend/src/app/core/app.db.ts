import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Label } from './label.model';

@Injectable({
  providedIn: 'root'
})
export class AppDB extends Dexie {
  labels!: Table<Label, string>;

  constructor() {
    super('LocalFirstAppDB');

    this.version(1).stores({
      labels: 'uuid, name, color, createdAt, updatedAt'
    });
  }
}
