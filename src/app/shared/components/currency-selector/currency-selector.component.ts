import { AsyncPipe } from '@angular/common';
import {
  Component,
  forwardRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { Currency } from '@core/services/currency/currency';
import {
  IonSelect,
  IonItem,
  IonSpinner,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-currency-selector',
  templateUrl: './currency-selector.component.html',
  styleUrls: ['./currency-selector.component.scss'],
  imports: [
    AsyncPipe,
    IonSelect,
    ReactiveFormsModule,
    IonItem,
    IonSpinner,
    IonSelectOption,
    TranslocoModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencySelectorComponent),
      multi: true,
    },
  ],
})
export class CurrencySelectorComponent {
  // --- Dependencies ---
  private currencyService = inject(Currency);

  // --- Inputs ---
  formControlName = input<string | number | null>(null);
  label = input<string | null | undefined>(null);
  placeholder = input<string | null | undefined>(null);
  errorText = input<string | null | undefined>(null);

  // --- Properties ---
  value = signal('');
  disabled = signal(false);

  currencies$ = this.currencyService.currencies$;
  isLoadingCurrencies$ = this.currencyService.loadingCurrencies$;

  // --- ControlValueAccessor Methods ---

  onChange: any = () => {};
  onTouched: any = () => {};
  writeValue(val: any): void {
    this.value.set(val || '');
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // --- Methods ---
  onCurrencyChange(event: CustomEvent) {
    this.value.set(event.detail.value);
    this.onChange(this.value());
    this.onTouched();
  }
}
