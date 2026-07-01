import { Component, computed, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { CategoryCardComponent } from '../category-card/category-card.component';
import type { CategoryTreeNode, TransactionCategory } from '@app-types/transaction-categories';

@Component({
  selector: 'app-category-group',
  templateUrl: './category-group.component.html',
  styleUrls: ['./category-group.component.scss'],
  standalone: true,
  imports: [IonIcon, TranslocoPipe, CategoryCardComponent],
})
export class CategoryGroupComponent {
  node = input.required<CategoryTreeNode>();

  edit = output<TransactionCategory>();
  delete = output<TransactionCategory>();

  rootIcon = computed(() => this.node().icon ?? 'folder-outline');
  hasChildren = computed(() => this.node().children.length > 0);

  onChildEdit(child: TransactionCategory): void {
    this.edit.emit(child);
  }

  onChildDelete(child: TransactionCategory): void {
    this.delete.emit(child);
  }
}
