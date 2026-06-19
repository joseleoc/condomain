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
  IonInput,
  IonTextarea,
  IonLabel,
  IonIcon,
  IonChip,
  IonButton,
  IonItem,
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
import { LocalStructure } from '@features/create-condominium/create-condominium.types';
import type { EnumeratorType } from '@features/create-condominium/create-condominium.types';
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
    IonInput,
    IonTextarea,
    IonLabel,
    IonIcon,
    IonChip,
    IonButton,
    IonItem,
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
  ],
})
export class MassiveCreationProcessComponent implements OnInit, OnDestroy {
  private wizardService = inject(Wizard);
  private toast = inject(Toast);
  private translocoService = inject(TranslocoService);
  private nextSubscription!: Subscription;

  mode = signal<'pattern' | 'custom'>('pattern');
  patternPrefix = signal('Torre ');
  patternEnumerator = signal<EnumeratorType>('letter');
  patternSuffix = signal('');
  patternCount = signal(5);
  customInput = signal('');

  structures = computed(() => this.wizardService.structures$.getValue());
  showingGenerator = signal(true);

  isOpenAddStructureModal = signal(false);
  addStructureFormComponent = viewChild(AddStructureFormComponent);

  ngOnInit(): void {
    this.showingGenerator.set(this.structures().length === 0);

    this.nextSubscription = this.wizardService.nextStep$.subscribe(() => {
      if (this.showingGenerator()) {
        const names = this.preview();
        if (names.length === 0) {
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

  parseCount(value: unknown): number {
    return Number(value) || 1;
  }

  preview = computed(() => {
    if (this.mode() === 'pattern') {
      return this.generatePatternPreview();
    }
    return this.customInput()
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  });

  private generateLetterSequence(n: number): string[] {
    const result: string[] = [];
    for (let i = 0; i < n; i++) {
      let label = '';
      let num = i;
      do {
        label = String.fromCharCode(65 + (num % 26)) + label;
        num = Math.floor(num / 26) - 1;
      } while (num >= 0);
      result.push(label);
    }
    return result;
  }

  private generatePatternPreview(): string[] {
    const prefix = this.patternPrefix();
    const suffix = this.patternSuffix();
    const count = this.patternCount();
    const enumerator = this.patternEnumerator();

    if (count < 1) return [];

    const labels =
      enumerator === 'letter'
        ? this.generateLetterSequence(count)
        : Array.from({ length: count }, (_, i) => String(i + 1));

    return labels.map((label) => `${prefix}${label}${suffix}`);
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
