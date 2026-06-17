import { Component, output } from '@angular/core';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-properties-list-empty',
  templateUrl: './properties-list-empty.component.html',
  styleUrls: ['./properties-list-empty.component.scss'],
  imports: [IonIcon, IonButton, TranslocoPipe],
})
export class PropertiesListEmptyComponent {
  addProperty = output<void>();

  emitClick() {
    this.addProperty.emit();
  }
}
