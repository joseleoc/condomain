import { Component, input } from '@angular/core';
import { IonLabel, IonNote, IonChip } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-property-preview',
  templateUrl: './property-preview.component.html',
  styleUrls: ['./property-preview.component.scss'],
  standalone: true,
  imports: [IonLabel, IonNote, IonChip, TranslocoPipe],
})
export class PropertyPreviewComponent {
  readonly previewGroups = input<{ structureName: string; names: string[] }[]>([]);
  readonly totalCount = input(0);
}
