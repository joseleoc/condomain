import { AsyncPipe } from '@angular/common';
import { Component, inject, OnInit, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonInput,
  IonButton,
  IonTextarea,
  IonIcon,
  IonItem,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';

interface AddStructureFormControls {
  name: FormControl<string>;
  description: FormControl<string | null>;
}
interface AddStructureFormValue {
  name: string;
  description: string | null;
}

@Component({
  selector: 'app-add-structure-form',
  templateUrl: './add-structure-form.component.html',
  styleUrls: ['./add-structure-form.component.scss'],
  imports: [
    ReactiveFormsModule,
    IonInput,
    IonTextarea,
    IonIcon,
    TranslocoPipe,
    AsyncPipe,
  ],
})
export class AddStructureFormComponent {
  // --- Dependencies ---
  private translocoService = inject(TranslocoService);
  // --- Outputs ---
  submitForm = output<AddStructureFormValue>();

  // --- Form ---
  addStructureForm = new FormGroup<AddStructureFormControls>({
    name: new FormControl('', {
      validators: [Validators.required, Validators.maxLength(50)],
      nonNullable: true,
    }),
    description: new FormControl('', {
      validators: [Validators.maxLength(120)],
    }),
  });

  // --- Properties ---
  nameErrors$ = this.addStructureForm.controls.name.statusChanges.pipe(
    map(() => {
      const nameControl = this.addStructureForm.controls.name;
      if (nameControl.hasError('required')) {
        return this.translocoService.translate('validation.required');
      }
      if (nameControl.hasError('maxlength')) {
        return this.translocoService.translate('validation.maxLength', {
          length: nameControl.getError('maxlength').requiredLength,
        });
      }
      return null;
    }),
  );

  descriptionErrors$ =
    this.addStructureForm.controls.description.statusChanges.pipe(
      map(() => {
        const descriptionControl = this.addStructureForm.controls.description;
        if (descriptionControl.hasError('maxlength')) {
          return this.translocoService.translate('validation.maxLength', {
            length: descriptionControl.getError('maxlength').requiredLength,
          });
        }
        return null;
      }),
    );

  // --- Methods ---
  submitAddStructureForm(): AddStructureFormValue | null {
    if (this.addStructureForm.valid) {
      const formValue: AddStructureFormValue = {
        name: this.addStructureForm.controls.name.value,
        description: this.addStructureForm.controls.description.value,
      };
      console.log('Submitting form with value:', formValue);
      this.submitForm.emit(formValue);
      return formValue;
    } else {
      console.log('Form is invalid');
      return null;
    }
  }
}
