import {Component, OnInit, inject, signal} from '@angular/core';
import {HealthCheckService} from './core/health-check.service';
import {Label} from './core/label.model';
import {RouterOutlet} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {LabelService} from './core/label.service';
import {AppDB} from './core/app.db';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  public healthService = inject(HealthCheckService);
  private labelService = inject(LabelService);
  private appDb = inject(AppDB);

  public backendUrl = signal(localStorage.getItem('backend_url') || '');
  public userId = signal(localStorage.getItem('user_id') || 'test_user_1');

  public labels = signal<Label[]>([]);
  public newLabelName = signal('');
  public newLabelColor = signal('#000000');
  public editingLabelId = signal<string | null>(null);
  public editName = signal('');
  public editColor = signal('');

  ngOnInit() {
    if (this.backendUrl()) {
      this.healthService.startHealthCheck();
    }
    this.fetchLabels();
  }

  async applySettings() {
    const url = this.backendUrl().trim();
    const currentUserId = this.userId().trim();

    localStorage.setItem('backend_url', url);
    localStorage.setItem('user_id', currentUserId);

    this.healthService.updateBaseUrl(url);
    await this.labelService.updateConfig(url, currentUserId);
  }

  fetchLabels() {
    this.labelService.getLabels().subscribe({
      next: (data: Label[]) => this.labels.set(data),
      error: (err: any) => console.error('Failed to load labels.', err)
    });
  }

  async createLabel() {
    if (!this.newLabelName().trim()) return;

    const request = {
      uuid: crypto.randomUUID(),
      name: this.newLabelName(),
      color: this.newLabelColor()
    };

    try {
      await this.labelService.createLabel(request);

      this.newLabelName.set('');
      this.newLabelColor.set('#000000');
    } catch (err: any) {
      console.error('Failed to create label', err);
    }
  }

  startEdit(label: Label) {
    this.editingLabelId.set(label.uuid);
    this.editName.set(label.name);
    this.editColor.set(label.color);
  }

  cancelEdit() {
    this.editingLabelId.set(null);
  }

  async saveEdit(uuid: string) {
    const request = {
      name: this.editName(),
      color: this.editColor()
    };

    try {
      await this.labelService.updateLabel(uuid, request);

      this.editingLabelId.set(null);
    } catch (err: any) {
      console.error('Failed to update label', err);
    }
  }

  async deleteLabel(uuid: string) {
    if (!confirm('Are you sure you want to delete this label?')) return;

    try {
      await this.labelService.deleteLabel(uuid);

      this.labels.update(current => current.filter(l => l.uuid !== uuid));
    } catch (err: any) {
      console.error('Failed to delete label', err);
    }
  }

  async refreshDb() {
    try {
      await this.appDb.labels.clear();
      await this.appDb.syncQueue.clear();
      this.labels.set([]);
      console.log('Database successfully cleared.');
    } catch (err: any) {
      console.error('Failed to clear the database', err);
    }
  }
}
