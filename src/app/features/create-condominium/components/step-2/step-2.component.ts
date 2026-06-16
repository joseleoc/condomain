import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
  selector: 'app-step-2',
  templateUrl: './step-2.component.html',
  styleUrls: ['./step-2.component.scss'],
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
export class Step2Component implements OnInit, OnDestroy {
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
