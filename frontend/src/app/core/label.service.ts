import {Injectable, inject} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Observable, from, firstValueFrom} from 'rxjs';
import {Label, LabelCreateRequest, LabelUpdateRequest} from './label.model';
import {AppDB, SyncAction} from './app.db';
import {HealthCheckService} from './health-check.service';

@Injectable({
  providedIn: 'root'
})
export class LabelService {
  private http = inject(HttpClient);
  private db = inject(AppDB);
  private health = inject(HealthCheckService);

  private apiUrl: string = 'http://localhost:8080/api/labels';
  private isSyncing = false;

  constructor() {
    this.initSync();
  }

  async initSync() {
    await this.pullServerChanges();
    await this.processSyncQueue();
  }

  getLabels(): Observable<Label[]> {
    return from(this.db.labels.toArray());
  }

  async createLabel(request: LabelCreateRequest): Promise<string> {
    const now = new Date().toISOString();
    const newLabel: Label = {...request, createdAt: now, updatedAt: now};

    await this.db.transaction('rw', this.db.labels, this.db.syncQueue, async () => {
      await this.db.labels.add(newLabel);
      await this.queueAction(request.uuid, 'CREATE', newLabel);
    });

    this.processSyncQueue();
    return request.uuid;
  }

  async updateLabel(id: string, request: LabelUpdateRequest): Promise<number> {
    const now = new Date().toISOString();
    const updateData = {...request, updatedAt: now};

    let updatedCount = 0;
    await this.db.transaction('rw', this.db.labels, this.db.syncQueue, async () => {
      updatedCount = await this.db.labels.update(id, updateData);
      await this.queueAction(id, 'UPDATE', updateData);
    });

    this.processSyncQueue();
    return updatedCount;
  }

  async deleteLabel(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.labels, this.db.syncQueue, async () => {
      await this.db.labels.delete(id);
      await this.queueAction(id, 'DELETE', null);
    });

    this.processSyncQueue();
  }

  private async queueAction(entityId: string, action: 'CREATE' | 'UPDATE' | 'DELETE', payload: any) {
    await this.db.syncQueue.add({
      entityId,
      action,
      payload,
      timestamp: Date.now()
    });
  }

  private async processSyncQueue() {
    if (!this.health.isHealthy() || this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queue = await this.db.syncQueue.orderBy('id').toArray();

      for (const item of queue) {
        try {
          if (item.action === 'CREATE') {
            await firstValueFrom(this.http.post(this.apiUrl, item.payload));
          } else if (item.action === 'UPDATE') {
            await firstValueFrom(this.http.put(`${this.apiUrl}/${item.entityId}`, item.payload));
          } else if (item.action === 'DELETE') {
            await firstValueFrom(this.http.delete(`${this.apiUrl}/${item.entityId}`));
          }
          await this.db.syncQueue.delete(item.id!);

        } catch (error: any) {
          console.error(`Sync action ${item.action} failed for ${item.entityId}`, error);

          if (error instanceof HttpErrorResponse) {
            const isRecoverable =
              error.status === 429 ||
              error.status >= 500 ||
              error.status === 0;

            if (isRecoverable) {
              await this.db.syncQueue.update(item.id!, {
                status: 'ERROR',
                retries: (item.retries || 0) + 1,
                lastError: `HTTP ${error.status}: ${error.message}`
              });

              break;

            } else {
              console.warn(`Discarding unrecoverable request (HTTP ${error.status})`);
              await this.db.syncQueue.delete(item.id!);
            }
          } else {
            await this.db.syncQueue.delete(item.id!);
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async pullServerChanges() {
    if (!this.health.isHealthy()) return;

    const lastSyncTime = localStorage.getItem('lastLabelSync') || '1970-01-01T00:00:00.000Z';

    try {
      const updatedLabels = await firstValueFrom(
        this.http.get<Label[]>(`${this.apiUrl}?updatedAfter=${lastSyncTime}`)
      );

      if (updatedLabels && updatedLabels.length > 0) {
        await this.db.labels.bulkPut(updatedLabels);
        localStorage.setItem('lastLabelSync', new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to pull delta updates', error);
    }
  }
}
