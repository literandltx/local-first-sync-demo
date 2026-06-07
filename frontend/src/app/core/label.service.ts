import {Injectable, inject, OnDestroy} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Observable, from, firstValueFrom, timer, Subscription} from 'rxjs';
import {Label, LabelCreateRequest, LabelUpdateRequest} from './label.model';
import {AppDB} from './app.db';
import {HealthCheckService} from './health-check.service';
import {liveQuery} from 'dexie';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';
import {RxStomp} from '@stomp/rx-stomp';

@Injectable({
  providedIn: 'root'
})
export class LabelService implements OnDestroy {
  private http = inject(HttpClient);
  private db = inject(AppDB);
  private health = inject(HealthCheckService);

  private baseUrl = localStorage.getItem('backend_url') || '';
  private isSyncing = false;

  private rxStomp = new RxStomp();
  private wsSubscription?: Subscription;
  private connectionSubscription?: Subscription;

  constructor() {
    toObservable(this.health.isHealthy)
      .pipe(takeUntilDestroyed())
      .subscribe((isHealthy) => {
      if (isHealthy && this.baseUrl) {
        this.processSyncQueue();
      }
    });

    if (this.baseUrl) {
      this.connectWebSocket(this.baseUrl);
    }
  }

  updateConfig(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
    this.connectWebSocket(this.baseUrl);
  }

  ngOnDestroy() {
    this.rxStomp.deactivate();
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
  }

  getLabels(): Observable<Label[]> {
    return from(liveQuery(() =>
      this.db.labels.filter(label => !label.deleted).toArray()
    ));
  }

  async createLabel(request: LabelCreateRequest): Promise<string> {
    const now = new Date().toISOString();
    const newLabel: Label = {...request, createdAt: now, updatedAt: now, deleted: false};

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
    const now = new Date().toISOString();

    await this.db.transaction('rw', this.db.labels, this.db.syncQueue, async () => {
      await this.db.labels.update(id, {deleted: true, updatedAt: now});
      await this.queueAction(id, 'DELETE', null);
    });

    this.processSyncQueue();
  }

  private connectWebSocket(url: string) {
    if (!url) {
      return;
    }

    this.rxStomp.deactivate();
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }

    const wsUrl = url.replace(/^http/, 'ws') + '/ws-labels';

    this.rxStomp.configure({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.rxStomp.activate();

    this.connectionSubscription = this.rxStomp.connected$.subscribe(async () => {
      console.log('WebSocket Connected! Pulling updates...');
      await this.processSyncQueue();
      await this.pullServerChanges();
    });

    this.wsSubscription = this.rxStomp.watch('/topic/labels').subscribe(async (message) => {
      const updatedLabel: Label = JSON.parse(message.body);
      console.log('Update received via WebSocket', updatedLabel);
      await this.db.labels.put(updatedLabel);
      localStorage.setItem('lastLabelSync', new Date().toISOString());
    });
  }


  private async queueAction(entityId: string, action: 'CREATE' | 'UPDATE' | 'DELETE', payload: any) {
    await this.db.syncQueue.add({
      entityId,
      action,
      payload,
      timestamp: Date.now(),
      status: 'PENDING',
      retries: 0
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

  private get apiUrl(): string {
    return `${this.baseUrl}/api/labels`;
  }
}
