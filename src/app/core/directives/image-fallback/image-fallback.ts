import { Directive, effect, input, signal } from '@angular/core';

@Directive({
  selector: 'img[withFallbackImage]',
  host: {
    '(error)': 'onError()',
    '[src]': 'currentSrc()',
  },
})
export class ImageFallback {
  readonly src = input.required<string>();
  readonly default = input.required<string>();
  readonly currentSrc = signal<string>('');

  constructor() {
    effect(() => {
      this.currentSrc.set(this.src());
    });
  }

  onError(): void {
    this.currentSrc.set(this.default());
  }
}
