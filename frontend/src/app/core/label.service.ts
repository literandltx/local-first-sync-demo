import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Label, LabelCreateRequest, LabelUpdateRequest } from './label.model';
import { AppDB } from './app.db';
import { HealthCheckService } from './health-check.service';

@Injectable({
  providedIn: 'root'
})
export class LabelService {
  private http = inject(HttpClient);
  private db = inject(AppDB);
  private health = inject(HealthCheckService);

  private apiUrl: string = 'http://localhost:8080/api/labels';

  getLabels(): Observable<Label[]> {
    return from(this.db.labels.toArray());
  }

  createLabel(request: LabelCreateRequest): Observable<string> {
    const now = new Date().toISOString();
    const newLabel: Label = {
      ...request,
      createdAt: now,
      updatedAt: now
    };

    const promise = this.db.labels.add(newLabel).then((id) => {
      this.syncCreateIfHealthy(newLabel);
      return id;
    });

    return from(promise);
  }

  updateLabel(id: string, request: LabelUpdateRequest): Observable<number> {
    const updateData = {
      ...request,
      updatedAt: new Date().toISOString()
    };

    const promise = this.db.labels.update(id, updateData).then((updatedCount) => {
      this.syncUpdateIfHealthy(id, request);
      return updatedCount;
    });

    return from(promise);
  }

  deleteLabel(id: string): Observable<void> {
    const promise = this.db.labels.delete(id).then(() => {
      this.syncDeleteIfHealthy(id);
    });

    return from(promise);
  }

  private syncCreateIfHealthy(label: Label) {
    if (this.health.isHealthy()) {
      this.http.post<Label>(this.apiUrl, label).pipe(
        catchError(err => of(null))
      ).subscribe();
    }
  }

  private syncUpdateIfHealthy(id: string, request: LabelUpdateRequest) {
    if (this.health.isHealthy()) {
      this.http.put<Label>(`${this.apiUrl}/${id}`, request).pipe(
        catchError(err => of(null))
      ).subscribe();
    }
  }

  private syncDeleteIfHealthy(id: string) {
    if (this.health.isHealthy()) {
      this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
        catchError(err => of(null))
      ).subscribe();
    }
  }
}
