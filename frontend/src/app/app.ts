import { Component, OnInit, inject } from '@angular/core';
import { HealthCheckService } from './core/health-check.service';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  public healthService = inject(HealthCheckService);

  ngOnInit() {
    this.healthService.startHealthCheck();
  }

  tmp() {
    const currentlyHealthy = this.healthService.isHealthy();
    console.log('Is it currently healthy?', currentlyHealthy);
  }
}
