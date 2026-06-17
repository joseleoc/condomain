import { Component, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-structures-list-empty',
  templateUrl: './structures-list-empty.component.html',
  styleUrls: ['./structures-list-empty.component.scss'],
  imports: [TranslocoPipe, IonButton, IonIcon],
})
export class StructuresListEmptyComponent {
  addStructure = output<void>();

  emitClick() {
    this.addStructure.emit();
  }
}
