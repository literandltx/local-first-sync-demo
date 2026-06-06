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

  private healthUrl: string = 'http://localhost:8080/actuator/health'

  private _isHealthy = signal<boolean>(false);
  public isHealthy = this._isHealthy.asReadonly();

  startHealthCheck() {
    if (this.pollingSubscription) {
      return;
    }

    this.pollingSubscription = timer(0, 60000)
      .pipe(
        switchMap(() =>
          this.http.get<HealthResponse>(this.healthUrl).pipe(
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
