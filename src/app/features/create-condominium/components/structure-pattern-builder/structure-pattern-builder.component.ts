import { Component, input, output, signal, computed } from '@angular/core';
import {
  IonLabel,
  IonNote,
  IonIcon,
  IonChip,
  IonInput,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { FormsModule } from '@angular/forms';

export type StructurePatternPart = 'prefix' | 'num' | 'letter' | 'suffix' | 'custom';

const VISIBLE_CHIP_COUNT = 3;

const CHIP_DEFS: { part: StructurePatternPart; labelKey: string }[] = [
  { part: 'prefix', labelKey: 'condominium.massive.componentPrefix' },
  { part: 'num', labelKey: 'condominium.massive.componentSequenceNum' },
  { part: 'letter', labelKey: 'condominium.massive.componentSequenceLetter' },
  { part: 'suffix', labelKey: 'condominium.massive.componentSuffix' },
  { part: 'custom', labelKey: 'condominium.massive.componentCustom' },
];

@Component({
  selector: 'app-structure-pattern-builder',
  templateUrl: './structure-pattern-builder.component.html',
  styleUrls: ['./structure-pattern-builder.component.scss'],
  standalone: true,
  imports: [IonLabel, IonNote, IonIcon, IonChip, IonInput, IonItem, TranslocoPipe, FormsModule],
})
export class StructurePatternBuilderComponent {
  readonly includePrefix = input(true);
  readonly includeNum = input(false);
  readonly includeLetter = input(true);
  readonly includeSuffix = input(false);
  readonly includeCustom = input(false);
  readonly displayPattern = input('');
  readonly prefixText = input('');
  readonly suffixText = input('');
  readonly customWord = input('');
  readonly customSeparator = input('');
  readonly selectedParts = input<StructurePatternPart[]>([]);

  readonly togglePart = output<StructurePatternPart>();
  readonly separatorChange = output<string>();
  readonly prefixTextChange = output<string>();
  readonly suffixTextChange = output<string>();
  readonly customWordChange = output<string>();

  readonly expanded = signal(false);

  readonly sortedChips = computed(() => {
    const order = this.selectedParts();
    const selected: typeof CHIP_DEFS = [];
    const unselected: typeof CHIP_DEFS = [];

    for (const chip of CHIP_DEFS) {
      if (order.includes(chip.part)) {
        selected.push(chip);
      } else {
        unselected.push(chip);
      }
    }

    selected.sort((a, b) => order.indexOf(a.part) - order.indexOf(b.part));
    unselected.sort((a, b) => a.part.localeCompare(b.part));

    return [...selected, ...unselected];
  });

  readonly visibleChips = computed(() =>
    this.expanded() ? this.sortedChips() : this.sortedChips().slice(0, VISIBLE_CHIP_COUNT),
  );

  readonly hasHidden = computed(() => this.sortedChips().length > VISIBLE_CHIP_COUNT);

  includeForPart(part: StructurePatternPart): boolean {
    switch (part) {
      case 'prefix': return this.includePrefix();
      case 'num': return this.includeNum();
      case 'letter': return this.includeLetter();
      case 'suffix': return this.includeSuffix();
      case 'custom': return this.includeCustom();
    }
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }
}
