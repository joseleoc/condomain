import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonLabel,
  IonIcon,
  IonChip,
  IonButton,
  IonItem,
  IonInput,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { Wizard } from '../../services/wizard/wizard';
import { StructuresListComponent } from '../structures-list/structures-list.component';
import { AddStructureFormComponent } from '../add-structure-form/add-structure-form.component';
import { StructurePatternBuilderComponent, StructurePatternPart } from '../structure-pattern-builder/structure-pattern-builder.component';
import { LocalStructure } from '@features/create-condominium/create-condominium.types';
import { Toast } from '@core/services/toast/toast';

@Component({
  selector: 'app-massive-creation-process',
  templateUrl: './massive-creation-process.component.html',
  styleUrls: ['./massive-creation-process.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    IonSegment,
    IonSegmentButton,
    IonTextarea,
    IonLabel,
    IonIcon,
    IonChip,
    IonButton,
    IonItem,
    IonInput,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonFooter,
    TranslocoPipe,
    StructuresListComponent,
    AddStructureFormComponent,
    StructurePatternBuilderComponent,
  ],
})
export class MassiveCreationProcessComponent implements OnInit, OnDestroy {
  private wizardService = inject(Wizard);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);
  private nextSubscription!: Subscription;

  mode = signal<'pattern' | 'custom'>('pattern');
  customInput = signal('');

  patternOrder = signal<StructurePatternPart[]>(['prefix', 'letter']);
  customSeparator = signal('');
  prefixText = signal('Torre ');
  suffixText = signal('');
  customWord = signal('');
  digits = signal(1);
  startAtNum = signal(1);
  startAtLetter = signal(1);
  count = signal(5);

  includePrefix = computed(() => this.patternOrder().includes('prefix'));
  includeNum = computed(() => this.patternOrder().includes('num'));
  includeLetter = computed(() => this.patternOrder().includes('letter'));
  includeSuffix = computed(() => this.patternOrder().includes('suffix'));
  includeCustom = computed(() => this.patternOrder().includes('custom'));

  nameTemplate = computed(() => {
    const order = this.patternOrder();
    const sep = this.customSeparator();
    const middle = order.filter((p) => p !== 'prefix' && p !== 'suffix');
    const prefix = order.includes('prefix') ? '{prefix}' : '';
    const suffix = order.includes('suffix') ? '{suffix}' : '';
    const joined = middle.map((p) => `{${p}}`).join(sep);
    return (prefix ? prefix + sep : '') + joined + (suffix ? sep + suffix : '');
  });

  hasPattern = computed(() => this.patternOrder().length > 0);

  displayPattern = computed(() => {
    return this.generateNames()[0] || '';
  });

  structures = computed(() => this.wizardService.structures$.getValue());
  showingGenerator = signal(true);

  isOpenAddStructureModal = signal(false);
  addStructureFormComponent = viewChild(AddStructureFormComponent);

  ngOnInit(): void {
    this.showingGenerator.set(this.structures().length === 0);

    this.nextSubscription = this.wizardService.nextStep$.subscribe(() => {
      if (this.showingGenerator()) {
        const names = this.preview();
        if (names.length === 0 || !this.hasPattern()) {
          this.toast.present({
            message: this.translocoService.translate(
              'condominium.massive.emptyPreview',
            ),
            dismissButton: true,
          });
          return;
        }

        for (const name of names) {
          this.wizardService.saveStructureLocally({
            name,
            description: '',
            properties: [],
          });
        }

        this.showingGenerator.set(false);
      } else {
        this.wizardService.setStep(3);
      }
    });
  }

  ngOnDestroy(): void {
    this.nextSubscription?.unsubscribe();
  }

  setMode(value: unknown): void {
    if (value === 'pattern' || value === 'custom') {
      this.mode.set(value);
    }
  }

  togglePart(part: StructurePatternPart): void {
    this.patternOrder.update((order) => {
      if (order.includes(part)) {
        return order.filter((p) => p !== part);
      }
      return [...order, part];
    });
  }

  preview = computed(() => {
    if (this.mode() === 'pattern') {
      return this.generateNames();
    }
    return this.customInput()
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  });

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
    const n = this.startAtNum() + index;
    const l = this.startAtLetter() + index;
    return {
      num: String(n).padStart(this.digits(), '0'),
      letter: this.numberToLetters(l),
    };
  }

  private generateNames(): string[] {
    const names: string[] = [];
    const count = this.count();

    for (let i = 0; i < count; i++) {
      const { num, letter } = this.formatEnum(i);
      const name = this.nameTemplate()
        .replace(/{prefix}/g, this.prefixText())
        .replace(/{suffix}/g, this.suffixText())
        .replace(/{custom}/g, this.customWord())
        .replace(/{num}/g, num)
        .replace(/{letter}/g, letter);
      names.push(name);
    }

    return names;
  }

  setCount(value: unknown): void {
    this.count.set(Math.max(1, Number(value) || 1));
  }

  handleDigitsChange(value: number): void {
    this.digits.set(Math.max(1, Math.min(5, value)));
  }

  handleStartAtNumChange(value: unknown): void {
    this.startAtNum.set(Math.max(1, Number(value) || 1));
  }

  handleIncrementStartAtNum(): void {
    this.startAtNum.update((v) => v + 1);
  }

  handleDecrementStartAtNum(): void {
    this.startAtNum.update((v) => Math.max(1, v - 1));
  }

  handleStartAtLetterChange(value: unknown): void {
    this.startAtLetter.set(Math.max(1, Number(value) || 1));
  }

  handleIncrementStartAtLetter(): void {
    this.startAtLetter.update((v) => v + 1);
  }

  handleDecrementStartAtLetter(): void {
    this.startAtLetter.update((v) => Math.max(1, v - 1));
  }

  editStructure(structure: LocalStructure): void {
    this.wizardService.selectedStructure.set(structure);
    this.openAddStructureModal();
  }

  clearSelectedStructure(): void {
    this.wizardService.selectedStructure.set(null);
  }

  openAddStructureModal(): void {
    this.isOpenAddStructureModal.set(true);
  }

  closeAddStructureModal(): void {
    this.isOpenAddStructureModal.set(false);
  }

  submitAddStructureForm(): void {
    const formComponent = this.addStructureFormComponent();
    if (!formComponent) return;

    const values = formComponent.submitAddStructureForm();
    if (!values) return;

    const success = this.wizardService.saveStructureLocally({
      ...values,
      properties: [],
    });
    if (success) {
      this.closeAddStructureModal();
    }
  }
}
