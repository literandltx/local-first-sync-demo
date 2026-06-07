import {Injectable, inject, OnDestroy, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {timer, Subscription, of} from 'rxjs';
import {switchMap, catchError} from 'rxjs/operators';

interface HealthResponse {
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class HealthCheckService implements OnDestroy {
  private http = inject(HttpClient);
  private pollingSubscription: Subscription | undefined;

  private baseUrl: string = localStorage.getItem('backend_url') || '';

  private _isHealthy = signal<boolean>(false);
  public isHealthy = this._isHealthy.asReadonly();

  updateBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, ''); // Strip trailing slash if accidentally added
    this.stopHealthCheck();
    if (this.baseUrl) {
      this.startHealthCheck();
    } else {
      this._isHealthy.set(false);
    }
  }

  startHealthCheck() {
    if (this.pollingSubscription) return;
    if (!this.baseUrl) return;

    const healthUrl = `${this.baseUrl}/actuator/health`;

    this.pollingSubscription = timer(0, 10000) // Poll health every 10s
      .pipe(
        switchMap(() =>
          this.http.get<HealthResponse>(healthUrl).pipe(
            catchError(() => {
              this._isHealthy.set(false);
              return of(null);
            })
          )
        )
      )
      .subscribe(response => {
        this._isHealthy.set(response?.status === 'UP');
      });
  }

  stopHealthCheck() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  ngOnDestroy() {
    this.stopHealthCheck();
  }
}
