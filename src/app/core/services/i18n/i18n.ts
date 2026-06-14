import { inject, Injectable } from '@angular/core';
import { AvailableLangs, TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class I18n {
  private translocoService = inject(TranslocoService);
  private availableLanguages: string[] = [];

  constructor() {
    this.availableLanguages =
      this.translocoService.getAvailableLangs() as string[];
  }

  get currentLang() {
    return this.translocoService.getActiveLang();
  }

  set currentLang(lang: string) {
    if (!this.availableLanguages.includes(lang)) {
      throw new Error(
        `Language ${lang} is not available. Available languages are: ${this.availableLanguages.join(', ')}`,
      );
    }

    this.translocoService.setActiveLang(lang);
  }
}
