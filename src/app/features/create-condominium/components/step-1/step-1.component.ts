import { Component, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { CreateCondominiumFormComponent } from '../create-condominium-form/create-condominium-form.component';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-step-1',
  templateUrl: './step-1.component.html',
  styleUrls: ['./step-1.component.scss'],
  imports: [CreateCondominiumFormComponent],
})
export class Step1Component implements OnInit, OnDestroy {
  // --- Dependencies ---
  private wizardService = inject(Wizard);

  // --- Properties ---
  private nextSubscription!: Subscription;
  private condominiumForm = viewChild(CreateCondominiumFormComponent);

  // --- Lifecycle hooks ---
  ngOnInit() {
    this.nextSubscription = this.wizardService.nextStep$.subscribe(async () => {
      const submitted = await this.submitForm();
      if (submitted) {
        this.wizardService.setStep(2);
      }
    });
  }
  ngOnDestroy(): void {
    if (this.nextSubscription) {
      this.nextSubscription.unsubscribe();
    }
  }
  // --- Methods ---
  /** Returns true if the form submission was successful */
  async submitForm() {
    const formData = this.condominiumForm()?.onSubmit();

    if (formData) {
      const existingCondo = this.wizardService.createdCondominium();

      if (existingCondo?.id) {
        const hasChanges =
          formData.name !== existingCondo.name ||
          formData.address !== existingCondo.address ||
          formData.currency !== existingCondo.currency ||
          formData.avatar != null;

        if (!hasChanges) {
          return true;
        }

        try {
          await this.wizardService.updateCondominium(existingCondo.id, {
            name: formData.name,
            address: formData.address,
            currency: formData.currency,
            avatar: formData.avatar,
          });
          return true;
        } catch {
          return false;
        }
      }

      try {
        await this.wizardService.createCondominium(formData);
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }
}
