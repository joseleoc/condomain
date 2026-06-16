import {
  Component,
  inject,
  OnInit,
  signal,
  viewChild,
  computed,
} from '@angular/core';
import { StructuresListEmptyComponent } from '../structures-list-empty/structures-list-empty.component';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { AddStructureFormComponent } from '../add-structure-form/add-structure-form.component';
import { Structures } from '@features/create-condominium/services/structures/structures';
import { toSignal } from '@angular/core/rxjs-interop';
import { StructuresListComponent } from '../structures-list/structures-list.component';

@Component({
  selector: 'app-simple-creation-process',
  templateUrl: './simple-creation-process.component.html',
  styleUrls: ['./simple-creation-process.component.scss'],
  imports: [
    StructuresListEmptyComponent,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    TranslocoPipe,
    IonContent,
    AddStructureFormComponent,
    IonCard,
    IonFooter,
    StructuresListComponent,
  ],
})
export class SimpleCreationProcessComponent implements OnInit {
  // --- Dependencies ---
  private structuresService = inject(Structures);
  // --- Components ---
  addStructureFormComponent = viewChild(AddStructureFormComponent);
  // --- Properties ---
  isOpenAddStructureModal = signal(false);
  structures = computed(toSignal(this.structuresService.structures$));

  constructor() {}

  ngOnInit() {}

  openAddStructureModal() {
    console.log('Opening add structure modal');
    this.isOpenAddStructureModal.set(true);
  }

  closeAddStructureModal() {
    this.isOpenAddStructureModal.set(false);
  }

  submitAddStructureForm() {
    const formComponent = this.addStructureFormComponent();
    if (formComponent) {
      const values = formComponent.submitAddStructureForm();
      if (values) {
        const success = this.structuresService.saveStructureLocally({
          ...values,
          properties: [],
        });
        if (success) {
          this.closeAddStructureModal();
        }
      }
      console.log(values);
    }
  }
}
