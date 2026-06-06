import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {Label, LabelCreateRequest, LabelUpdateRequest} from './label.model';

@Injectable({
  providedIn: 'root'
})
export class LabelService {
  private http = inject(HttpClient);
  private apiUrl: string = 'http://localhost:8080/api/labels';

  getLabels(): Observable<Label[]> {
    return this.http.get<Label[]>(this.apiUrl);
  }

  createLabel(request: LabelCreateRequest): Observable<Label> {
    return this.http.post<Label>(this.apiUrl, request);
  }

  updateLabel(id: string, request: LabelUpdateRequest): Observable<Label> {
    return this.http.put<Label>(`${this.apiUrl}/${id}`, request);
  }

  deleteLabel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
