import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { I18n } from '@core/services/i18n/i18n';
import { IonSelect, IonSelectOption, IonIcon } from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss'],
  imports: [IonSelect, TranslocoModule, IonSelectOption, IonIcon],
})
export class languageSelectorComponent {
  // --- Dependencies ---
  private i18nService = inject(I18n);

  // --- Properties ---
  selectedLanguage = signal<string>(this.i18nService.currentLang);

  // --- Methods ---
  changeLanguage(event: CustomEvent) {
    const selectedLang = event.detail.value;
    this.i18nService.currentLang = selectedLang;
    this.selectedLanguage.set(selectedLang);
  }
}
