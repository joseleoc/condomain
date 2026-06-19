import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonInput,
  IonNote,
  IonIcon,
  IonChip,
  IonButton,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { Wizard } from '../../services/wizard/wizard';
import { StructuresPropertiesAccordionComponent } from '../structures-properties-accordion/structures-properties-accordion.component';
import { PropertyPatternBuilderComponent, PatternPart } from '../property-pattern-builder/property-pattern-builder.component';
import { PropertyPreviewComponent } from '../property-preview/property-preview.component';
import { Toast } from '@core/services/toast/toast';

interface PropertyPreviewGroup {
  structureName: string;
  names: string[];
  fee: number;
}

@Component({
  selector: 'app-massive-property-creation',
  templateUrl: './massive-property-creation.component.html',
  styleUrls: ['./massive-property-creation.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonInput,
    IonNote,
    IonIcon,
    IonChip,
    IonButton,
    IonItem,
    TranslocoPipe,
    StructuresPropertiesAccordionComponent,
    PropertyPatternBuilderComponent,
    PropertyPreviewComponent,
  ],
})
export class MassivePropertyCreationComponent implements OnInit, OnDestroy {
  private wizardService = inject(Wizard);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);
  private nextSubscription!: Subscription;

  digits = signal(2);
  countPerStructure = signal(2);
  fee = signal(0);
  startAt = signal(1);
  splitEqually = signal(false);

  includeName = signal(false);
  includeFirstWord = signal(false);
  includeShort = signal(true);
  includeFirstLetter = signal(false);
  includeNum = signal(true);
  includeLetter = signal(false);
  customSeparator = signal('');

  nameTemplate = computed(() => {
    const parts: string[] = [];
    if (this.includeName()) parts.push('{name}');
    if (this.includeFirstWord()) parts.push('{firstword}');
    if (this.includeShort()) parts.push('{short}');
    if (this.includeFirstLetter()) parts.push('{firstletter}');
    if (this.includeNum()) parts.push('{num}');
    if (this.includeLetter()) parts.push('{letter}');
    return parts.join(this.customSeparator());
  });

  hasPart = computed(() => ({
    name: this.includeName(),
    firstWord: this.includeFirstWord(),
    short: this.includeShort(),
    firstLetter: this.includeFirstLetter(),
    num: this.includeNum(),
    letter: this.includeLetter(),
  }));

  displayPattern = computed(() => {
    const structures = this.structures();
    const name = structures.length > 0 ? structures[0].name : 'Estructura';
    return this.generateNames(name)[0] || '';
  });

  maxFee = computed(() => {
    const count = this.totalPropertyCount();
    return count > 0 ? Math.floor(100 / count) : 100;
  });

  structures = computed(() => this.wizardService.structures$.getValue());
  showingGenerator = signal(true);

  preview = computed(() => {
    const result: PropertyPreviewGroup[] = [];

    for (const structure of this.structures()) {
      const names = this.generateNames(structure.name);
      result.push({
        structureName: structure.name,
        names,
        fee: this.fee(),
      });
    }

    return result;
  });

  totalPropertyCount = computed(() => {
    return this.preview().reduce((acc, g) => acc + g.names.length, 0);
  });

  ngOnInit(): void {
    this.showingGenerator.set(!this.hasAnyProperties());

    this.nextSubscription = this.wizardService.nextStep$.subscribe(() => {
      if (this.showingGenerator()) {
        const preview = this.preview();
        const total = preview.reduce((acc, g) => acc + g.names.length, 0);

        if (total === 0) {
          this.toast.present({
            message: this.translocoService.translate(
              'condominium.massiveProperty.emptyPreview',
            ),
            dismissButton: true,
          });
          return;
        }

        for (const group of preview) {
          for (const name of group.names) {
            this.wizardService.addPropertyToStructure(group.structureName, {
              number: name,
              fee: group.fee,
              structure: group.structureName,
              ownerName: null,
              ownerEmail: null,
            });
          }
        }

        this.showingGenerator.set(false);
      } else {
        this.wizardService.createStructuresAndProperties();
      }
    });
  }

  ngOnDestroy(): void {
    this.nextSubscription?.unsubscribe();
  }

  private hasAnyProperties(): boolean {
    return this.structures().some((s) => s.properties.length > 0);
  }

  private getParts(name: string): { firstWord: string; lastWord: string; firstLetter: string } {
    const words = name.trim().split(/\s+/);
    return {
      firstWord: words[0],
      lastWord: words.length > 1 ? words[words.length - 1] : name,
      firstLetter: name.trim().charAt(0).toUpperCase(),
    };
  }

  private numberToLetters(n: number): string {
    let label = '';
    let num = n;
    do {
      num--;
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26);
    } while (num > 0);
    return label;
  }

  private formatEnum(index: number): { num: string; letter: string } {
    const n = this.startAt() + index;
    return {
      num: String(n).padStart(this.digits(), '0'),
      letter: this.numberToLetters(n),
    };
  }

  private generateNames(structureName: string): string[] {
    const names: string[] = [];
    const { firstWord, lastWord, firstLetter } = this.getParts(structureName);
    const count = this.countPerStructure();

    for (let i = 0; i < count; i++) {
      const { num, letter } = this.formatEnum(i);
      const name = this.nameTemplate()
        .replace(/{name}/g, structureName)
        .replace(/{firstword}/g, firstWord)
        .replace(/{short}/g, lastWord)
        .replace(/{firstletter}/g, firstLetter)
        .replace(/{num}/g, num)
        .replace(/{letter}/g, letter);

      names.push(name);
    }

    return names;
  }

  setFee(value: unknown): void {
    this.fee.set(Math.min(this.maxFee(), Number(value) || 0));
  }

  setCount(value: unknown): void {
    this.countPerStructure.set(Math.max(1, Number(value) || 1));
    if (this.splitEqually()) {
      this.applySplitEqually();
    }
  }

  togglePart(part: PatternPart): void {
    switch (part) {
      case 'name': this.includeName.update((v) => !v); break;
      case 'firstword': this.includeFirstWord.update((v) => !v); break;
      case 'short': this.includeShort.update((v) => !v); break;
      case 'firstletter': this.includeFirstLetter.update((v) => !v); break;
      case 'num': this.includeNum.update((v) => !v); break;
      case 'letter': this.includeLetter.update((v) => !v); break;
    }
  }

  toggleSplitEqually(): void {
    this.splitEqually.update((v) => !v);
    if (this.splitEqually()) {
      this.applySplitEqually();
    }
  }

  private applySplitEqually(): void {
    const fee = Math.floor(100 / Math.max(1, this.totalPropertyCount()));
    this.fee.set(Math.min(fee, this.maxFee()));
  }

  handleDigitsChange(value: number): void {
    this.digits.set(Math.max(1, Math.min(5, value)));
  }

  handleStartAtChange(value: unknown): void {
    this.startAt.set(Math.max(1, Number(value) || 1));
  }

  handleIncrementStartAt(): void {
    this.startAt.update((v) => v + 1);
  }

  handleDecrementStartAt(): void {
    this.startAt.update((v) => Math.max(1, v - 1));
  }
}
