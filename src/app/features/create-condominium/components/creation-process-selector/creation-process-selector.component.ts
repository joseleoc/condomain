import { Component, inject, OnInit, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonRadioGroup,
  IonRadio,
  IonIcon,
} from '@ionic/angular/standalone';
import { Subscription } from 'rxjs/internal/Subscription';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { CreateCondominiumProcessOptions } from '@features/create-condominium/create-condominium.types';
@Component({
  selector: 'app-creation-process-selector',
  templateUrl: './creation-process-selector.component.html',
  styleUrls: ['./creation-process-selector.component.scss'],
  imports: [
    TranslocoPipe,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonRadioGroup,
    IonRadio,
    IonIcon,
  ],
})
export class CreationProcessSelectorComponent implements OnInit {
  // --- Dependencies ---
  private wizardService = inject(Wizard);

  // --- Output ---
  onSelectionSubmitted = output<CreateCondominiumProcessOptions | null>();

  // --- Properties ---
  private nextSubscription!: Subscription;
  selectedOption = signal<CreateCondominiumProcessOptions | null>(null);

  // --- Lifecycle hooks ---
  ngOnInit() {
    this.nextSubscription = this.wizardService.nextStep$.subscribe(async () => {
      this.handleSubmit();
    });
  }
  ngOnDestroy(): void {
    if (this.nextSubscription) {
      this.nextSubscription.unsubscribe();
    }
  }

  selectOption(option: CreateCondominiumProcessOptions) {
    this.selectedOption.set(option);
  }

  handleSubmit() {
    this.onSelectionSubmitted.emit(this.selectedOption());
  }
}
