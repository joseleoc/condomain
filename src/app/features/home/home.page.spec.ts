import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedTestingModule } from '@testing/shared-testing.module';
import { BehaviorSubject } from 'rxjs';
import { CondominiumAccounts } from '@core/services/condominium-accounts/condominium-accounts';
import { TransactionCategories } from '@core/services/transaction-categories/transaction-categories';
import { Currency } from '@core/services/currency/currency';

import { HomePage } from './home.page';

function createMockAccountsService(): CondominiumAccounts {
  return {
    accounts$: new BehaviorSubject([]),
    fetchByCondominium: () => Promise.resolve([]),
  } as unknown as CondominiumAccounts;
}

function createMockCategoriesService(): TransactionCategories {
  return {
    categories$: new BehaviorSubject([]),
    fetchByCondominium: () => Promise.resolve([]),
  } as unknown as TransactionCategories;
}

function createMockCurrencyService(): Currency {
  return {
    currencies$: new BehaviorSubject([]),
  } as unknown as Currency;
}

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, HomePage],
      providers: [
        { provide: CondominiumAccounts, useFactory: createMockAccountsService },
        { provide: TransactionCategories, useFactory: createMockCategoriesService },
        { provide: Currency, useFactory: createMockCurrencyService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
