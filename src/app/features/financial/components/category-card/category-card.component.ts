import { Component, computed, input, output } from '@angular/core';
import { IonCard, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { TransactionCategory } from '@app-types/transaction-categories';

@Component({
  selector: 'app-category-card',
  templateUrl: './category-card.component.html',
  styleUrls: ['./category-card.component.scss'],
  standalone: true,
  imports: [IonCard, IonIcon, TranslocoPipe],
})
export class CategoryCardComponent {
  category = input.required<TransactionCategory>();
  editable = input<boolean>(true);

  edit = output<void>();
  delete = output<void>();

  isSystem = computed(() => this.category().is_system);
  canEdit = computed(() => this.editable() && !this.category().is_system);
  iconName = computed(() => this.category().icon ?? 'folder-outline');

  onEdit(): void {
    this.edit.emit();
  }

  onDelete(): void {
    this.delete.emit();
  }
}
