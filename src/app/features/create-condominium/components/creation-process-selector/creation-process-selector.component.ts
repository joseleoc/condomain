import { Component, inject, OnInit, signal } from '@angular/core';
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

  // --- Properties ---
  private nextSubscription!: Subscription;
  selectedOption = signal<'simple' | 'massive' | 'ai'>('simple');

  // --- Lifecycle hooks ---
  ngOnInit() {
    this.nextSubscription = this.wizardService.nextStep$.subscribe(async () => {
      console.log(this.selectedOption());
    });
  }
  ngOnDestroy(): void {
    if (this.nextSubscription) {
      this.nextSubscription.unsubscribe();
    }
  }

  selectOption(option: 'simple' | 'massive' | 'ai') {
    this.selectedOption.set(option);
  }

  handleNext() {
    console.log('Next clicked');
  }
}
