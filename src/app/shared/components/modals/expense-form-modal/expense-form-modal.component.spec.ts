import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseFormModalComponent } from './expense-form-modal.component';
import { ExpensesService } from '@core/services/expenses/expenses.service';
import { Toast } from '@core/services/toast/toast';
import { TranslocoService } from '@jsverse/transloco';
import { ExpenseFormComponent, ExpenseFormValue } from '@shared/components/forms/expense-form/expense-form.component';

describe('ExpenseFormModalComponent', () => {
  let component: ExpenseFormModalComponent;
  let fixture: ComponentFixture<ExpenseFormModalComponent>;
  let expensesServiceSpy: jasmine.SpyObj<ExpensesService>;
  let toastSpy: jasmine.SpyObj<Toast>;
  let translocoSpy: jasmine.SpyObj<TranslocoService>;

  const mockExpenseFormValue: ExpenseFormValue = {
    account_id: 'account-1',
    category_id: 'category-1',
    amount: 100,
    original_currency: 'USD',
    exchange_rate: 1,
    description: 'Test expense',
    reference_number: null,
    transaction_date: '2026-01-01',
  };

  beforeEach(async () => {
    const expSpy = jasmine.createSpyObj('ExpensesService', ['createExpense']);
    const toastSpyObj = jasmine.createSpyObj('Toast', ['present']);
    const translocoSpyObj = jasmine.createSpyObj('TranslocoService', ['translate']);
    translocoSpyObj.translate.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [ExpenseFormModalComponent],
      providers: [
        { provide: ExpensesService, useValue: expSpy },
        { provide: Toast, useValue: toastSpyObj },
        { provide: TranslocoService, useValue: translocoSpyObj },
      ],
    })
    .overrideComponent(ExpenseFormModalComponent, {
      set: {
        // Mock the child form component
        imports: [...(ExpenseFormModalComponent as any).decorators?.[0]?.imports || []],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseFormModalComponent);
    component = fixture.componentInstance;

    expensesServiceSpy = TestBed.inject(ExpensesService) as jasmine.SpyObj<ExpensesService>;
    toastSpy = TestBed.inject(Toast) as jasmine.SpyObj<Toast>;
    translocoSpy = TestBed.inject(TranslocoService) as jasmine.SpyObj<TranslocoService>;

    // Set required inputs
    fixture.componentRef.setInput('condominiumId', 'condo-1');
    fixture.componentRef.setInput('baseCurrency', 'USD');
    fixture.componentRef.setInput('isOpen', true);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onFormSubmit', () => {
    it('should call ExpensesService.createExpense with correct data', async () => {
      expensesServiceSpy.createExpense.and.returnValue(Promise.resolve({} as any));

      await component.onFormSubmit(mockExpenseFormValue);

      expect(expensesServiceSpy.createExpense).toHaveBeenCalledWith({
        condominium_id: 'condo-1',
        account_id: 'account-1',
        category_id: 'category-1',
        amount: 100,
        original_currency: 'USD',
        exchange_rate: 1,
        description: 'Test expense',
        reference_number: null,
        transaction_date: '2026-01-01',
      });
    });

    it('should show success toast on successful creation', async () => {
      expensesServiceSpy.createExpense.and.returnValue(Promise.resolve({} as any));

      await component.onFormSubmit(mockExpenseFormValue);

      expect(toastSpy.present).toHaveBeenCalledWith({
        message: 'financial.transactions.toast.expenseCreated',
        color: 'success',
        duration: 2000,
      });
    });

    it('should close modal on successful creation', async () => {
      expensesServiceSpy.createExpense.and.returnValue(Promise.resolve({} as any));
      spyOn(component.isOpenChange, 'emit');

      await component.onFormSubmit(mockExpenseFormValue);

      expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    });

    it('should emit formSubmit on successful creation', async () => {
      expensesServiceSpy.createExpense.and.returnValue(Promise.resolve({} as any));
      spyOn(component.formSubmit, 'emit');

      await component.onFormSubmit(mockExpenseFormValue);

      expect(component.formSubmit.emit).toHaveBeenCalledWith(mockExpenseFormValue);
    });

    it('should show error toast on failure', async () => {
      const error = new Error('Creation failed');
      expensesServiceSpy.createExpense.and.returnValue(Promise.reject(error));

      await component.onFormSubmit(mockExpenseFormValue);

      expect(toastSpy.present).toHaveBeenCalledWith({
        message: 'financial.transactions.toast.expenseCreateError',
        color: 'danger',
        duration: 3000,
      });
    });

    it('should show duplicate reference error for code 23505', async () => {
      const error = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "reference_unique_active"',
      };
      expensesServiceSpy.createExpense.and.returnValue(Promise.reject(error));

      await component.onFormSubmit(mockExpenseFormValue);

      expect(toastSpy.present).toHaveBeenCalledWith({
        message: 'financial.transactions.toast.duplicateReferenceNumber',
        color: 'danger',
        duration: 3000,
      });
    });

    it('should NOT close modal on error', async () => {
      const error = new Error('Creation failed');
      expensesServiceSpy.createExpense.and.returnValue(Promise.reject(error));
      spyOn(component.isOpenChange, 'emit');

      await component.onFormSubmit(mockExpenseFormValue);

      expect(component.isOpenChange.emit).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should emit isOpenChange with false', () => {
      spyOn(component.isOpenChange, 'emit');

      component.cancel();

      expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    });
  });

  describe('submit', () => {
    it('should call expenseForm().submit()', () => {
      // Mock the expenseForm viewChild
      const mockExpenseForm = {
        submit: jasmine.createSpy('submit'),
      };
      (component as any).expenseForm = () => mockExpenseForm;

      component.submit();

      expect(mockExpenseForm.submit).toHaveBeenCalled();
    });
  });
});
