import { Component, input, output } from '@angular/core';
import {
  IonLabel,
  IonNote,
  IonIcon,
  IonChip,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-property-pattern-builder',
  templateUrl: './property-pattern-builder.component.html',
  styleUrls: ['./property-pattern-builder.component.scss'],
  standalone: true,
  imports: [IonLabel, IonNote, IonIcon, IonChip, TranslocoPipe],
})
export class PropertyPatternBuilderComponent {
  readonly includeName = input(false);
  readonly includeShort = input(true);
  readonly includeNum = input(true);
  readonly customSeparator = input('');
  readonly displayPattern = input('');

  readonly togglePart = output<'name' | 'short' | 'num'>();
  readonly separatorChange = output<string>();
}
