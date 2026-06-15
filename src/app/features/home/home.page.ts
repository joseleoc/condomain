import { Component, inject } from '@angular/core';
import { MainLayoutComponent } from '@shared/components/layout/main-layout/main-layout.component';
import { Condominium } from '@core/services/condominium/condominium';
import { toSignal } from '@angular/core/rxjs-interop';
import { NewCondoAnimatedBtnComponent } from '@shared/components/new-condo-animated-btn/new-condo-animated-btn.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [MainLayoutComponent, NewCondoAnimatedBtnComponent],
})
export class HomePage {
  private condominiumService = inject(Condominium);

  // --- Properties ---
  activeCondominium = toSignal(this.condominiumService.activeCondominium$);
  // --- Methods ---
}
