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
        this.wizardService.step.set(2);
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
    // Submit the form, triggers validation and if it is valid it returns the form data, otherwise it returns null
    const formData = this.condominiumForm()?.onSubmit();

    if (formData) {
      try {
        // Calls the API to create the condominium with the form data, if it is successful it returns the created condominium, otherwise it throws an error
        await this.wizardService.createCondominium(formData);
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }
}
