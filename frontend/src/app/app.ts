import {Component, OnInit, inject, signal} from '@angular/core';
import {HealthCheckService} from './core/health-check.service';
import {Label} from './core/label.model';
import {RouterOutlet} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {LabelService} from './core/label.service'; // Imported for ngModel

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  public healthService = inject(HealthCheckService);
  private labelService = inject(LabelService);

  public labels = signal<Label[]>([]);
  public newLabelName = signal('');
  public newLabelColor = signal('#000000');
  public editingLabelId = signal<string | null>(null);
  public editName = signal('');
  public editColor = signal('');

  ngOnInit() {
    this.healthService.startHealthCheck();
    this.fetchLabels();
  }

  fetchLabels() {
    this.labelService.getLabels().subscribe({
      next: (data) => this.labels.set(data),
      error: (err) => console.error('Failed to load labels.', err)
    });
  }

  createLabel() {
    if (!this.newLabelName().trim()) return;

    const request = {
      uuid: crypto.randomUUID(),
      name: this.newLabelName(),
      color: this.newLabelColor()
    };

    this.labelService.createLabel(request).subscribe({
      next: (createdLabel) => {
        this.labels.update(current => [...current, createdLabel]);
        this.newLabelName.set('');
        this.newLabelColor.set('#000000');
      },
      error: (err) => console.error('Failed to create label', err)
    });
  }

  startEdit(label: Label) {
    this.editingLabelId.set(label.uuid);
    this.editName.set(label.name);
    this.editColor.set(label.color);
  }

  cancelEdit() {
    this.editingLabelId.set(null);
  }

  saveEdit(uuid: string) {
    const request = {
      name: this.editName(),
      color: this.editColor()
    };

    this.labelService.updateLabel(uuid, request).subscribe({
      next: (updatedLabel) => {
        this.labels.update(current =>
          current.map(l => l.uuid === uuid ? updatedLabel : l)
        );
        this.editingLabelId.set(null);
      },
      error: (err) => console.error('Failed to update label', err)
    });
  }

  deleteLabel(uuid: string) {
    if (!confirm('Are you sure you want to delete this label?')) return;

    this.labelService.deleteLabel(uuid).subscribe({
      next: () => {
        this.labels.update(current => current.filter(l => l.uuid !== uuid));
      },
      error: (err) => console.error('Failed to delete label', err)
    });
  }
}
