import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { Toast } from '@core/services/toast/toast';
import { MassivePropertyCreationComponent } from './massive-property-creation.component';
import { BehaviorSubject, Subject } from 'rxjs';
import { SharedTestingModule } from '@testing/shared-testing.module';

describe('MassivePropertyCreationComponent', () => {
  let component: MassivePropertyCreationComponent;
  let fixture: ComponentFixture<MassivePropertyCreationComponent>;
  let wizardMock: jasmine.SpyObj<Wizard>;
  let toastMock: jasmine.SpyObj<Toast>;
  let translocoMock: jasmine.SpyObj<TranslocoService>;

  beforeEach(async () => {
    wizardMock = jasmine.createSpyObj('Wizard', [
      'addPropertyToStructure',
      'createStructuresAndProperties',
      'markBackHandled',
    ], {
      structures$: new BehaviorSubject([]),
      nextStep$: new BehaviorSubject<void>(undefined),
      backStep$: new Subject<void>(),
    });

    toastMock = jasmine.createSpyObj('Toast', ['present']);
    const langChanges$ = new BehaviorSubject('en');
    translocoMock = {
      translate: jasmine.createSpy('translate').and.callFake((key: string) => key),
      langChanges$: langChanges$.asObservable(),
      config: { reRenderOnLangChange: false },
    } as unknown as jasmine.SpyObj<TranslocoService>;

    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), MassivePropertyCreationComponent],
      providers: [
        { provide: Wizard, useValue: wizardMock },
        { provide: Toast, useValue: toastMock },
        { provide: TranslocoService, useValue: translocoMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MassivePropertyCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in generator mode when no properties exist', () => {
    expect(component.showingGenerator()).toBeTrue();
  });

  it('should toggle parts on and off', () => {
    expect(component.includeName()).toBeFalse();
    expect(component.includeFirstWord()).toBeFalse();
    expect(component.includeShort()).toBeTrue();
    expect(component.includeFirstLetter()).toBeFalse();
    expect(component.includeNum()).toBeTrue();
    expect(component.includeLetter()).toBeFalse();

    component.togglePart('name');
    expect(component.includeName()).toBeTrue();

    component.togglePart('short');
    expect(component.includeShort()).toBeFalse();

    component.togglePart('num');
    expect(component.includeNum()).toBeFalse();

    component.togglePart('firstword');
    expect(component.includeFirstWord()).toBeTrue();

    component.togglePart('firstletter');
    expect(component.includeFirstLetter()).toBeTrue();

    component.togglePart('letter');
    expect(component.includeLetter()).toBeTrue();
  });

  it('should generate names using toggled parts and separator', () => {
    component.patternOrder.set(['name', 'short', 'num']);
    component.customSeparator.set(' - ');
    component.countPerStructure.set(2);
    component.startAtNum.set(1);
    component.digits.set(2);

    const names = component['generateNames']('Torre A');

    expect(names.length).toBe(2);
    expect(names[0]).toBe('Torre A - A - 01');
    expect(names[1]).toBe('Torre A - A - 02');
  });

  it('should generate names with only short and number by default', () => {
    component.countPerStructure.set(2);
    component.startAtNum.set(1);
    component.digits.set(2);

    const names = component['generateNames']('Edificio Central');

    expect(names.length).toBe(2);
    expect(names[0]).toBe('Central01');
    expect(names[1]).toBe('Central02');
  });

  it('should include first word in generated names', () => {
    component.patternOrder.set(['firstword', 'short', 'num']);
    component.countPerStructure.set(1);
    component.startAtNum.set(1);

    const names = component['generateNames']('Torre A');

    expect(names[0]).toContain('Torre');
  });

  it('should include first letter in generated names', () => {
    component.patternOrder.set(['firstletter', 'short', 'num']);
    component.countPerStructure.set(1);
    component.startAtNum.set(1);

    const names = component['generateNames']('Edificio Central');

    expect(names[0]).toContain('E');
  });

  it('should generate letter-based sequential names', () => {
    component.patternOrder.set(['letter', 'short']);
    component.countPerStructure.set(3);
    component.startAtNum.set(1);

    const names = component['generateNames']('Torre A');

    expect(names[0]).toContain('A');
    expect(names[1]).toContain('B');
    expect(names[2]).toContain('C');
  });

  it('should return zero total when no structures exist', () => {
    component.countPerStructure.set(5);
    const count = component.totalPropertyCount();
    expect(count).toBe(0);
  });

  it('should set count with minimum of 1', () => {
    component.setCount(0);
    expect(component.countPerStructure()).toBe(1);

    component.setCount(10);
    expect(component.countPerStructure()).toBe(10);
  });

  it('should update nameTemplate when toggling parts', () => {
    expect(component.nameTemplate()).toBe('{short}{num}');

    component.togglePart('name');
    expect(component.nameTemplate()).toBe('{short}{num}{name}');

    component.togglePart('short');
    expect(component.nameTemplate()).toBe('{num}{name}');
  });

  it('should apply separator in nameTemplate', () => {
    component.customSeparator.set(' ');
    expect(component.nameTemplate()).toBe('{short} {num}');

    component.togglePart('name');
    expect(component.nameTemplate()).toBe('{short} {num} {name}');
  });

  it('should cap fee at maxFee', () => {
    component.countPerStructure.set(2);
    component.setFee(200);
    expect(component.fee()).toBe(component.maxFee());
  });

  it('should toggle split equally and apply calculation', () => {
    component.countPerStructure.set(2);
    component.toggleSplitEqually();
    expect(component.splitEqually()).toBeTrue();
    expect(component.fee()).toBeGreaterThan(0);
  });

  it('should disable fee input when split equally is active', () => {
    component.toggleSplitEqually();
    expect(component.splitEqually()).toBeTrue();
  });

  describe('split equally fee distribution', () => {
    let nextStepSubject: Subject<void>;

    beforeEach(() => {
      nextStepSubject = new Subject<void>();
      wizardMock = jasmine.createSpyObj('Wizard', [
        'addPropertyToStructure',
        'createStructuresAndProperties',
        'markBackHandled',
      ], {
        structures$: new BehaviorSubject([
          { name: 'Tower A', description: '', properties: [] },
          { name: 'Tower B', description: '', properties: [] },
        ]),
        nextStep$: nextStepSubject.asObservable(),
        backStep$: new Subject<void>(),
      });
      wizardMock.addPropertyToStructure.and.returnValue(true);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [SharedTestingModule, IonicModule.forRoot(), MassivePropertyCreationComponent],
        providers: [
          { provide: Wizard, useValue: wizardMock },
          { provide: Toast, useValue: toastMock },
          { provide: TranslocoService, useValue: translocoMock },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(MassivePropertyCreationComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should distribute fee equally when splitEqually is active and count divides 100 evenly', () => {
      component.countPerStructure.set(2);
      component.splitEqually.set(true);

      nextStepSubject.next();

      expect(wizardMock.addPropertyToStructure).toHaveBeenCalledTimes(4);
      const calls = wizardMock.addPropertyToStructure.calls.all();
      for (const call of calls) {
        expect(call.args[1].fee).toBe(25);
      }
    });

    it('should distribute fee with remainder when count does not divide 100 evenly', () => {
      component.countPerStructure.set(3);
      component.splitEqually.set(true);

      nextStepSubject.next();

      expect(wizardMock.addPropertyToStructure).toHaveBeenCalledTimes(6);
      const calls = wizardMock.addPropertyToStructure.calls.all();
      const fees = calls.map((c) => c.args[1].fee);
      const totalFee = fees.reduce((sum, f) => sum + f, 0);
      expect(totalFee).toBe(100);
    });

    it('should distribute fee correctly when total properties exceed 100', () => {
      component.countPerStructure.set(51);
      component.splitEqually.set(true);

      nextStepSubject.next();

      expect(wizardMock.addPropertyToStructure).toHaveBeenCalledTimes(102);
      const calls = wizardMock.addPropertyToStructure.calls.all();
      const fees = calls.map((c) => c.args[1].fee);
      const totalFee = fees.reduce((sum, f) => sum + f, 0);
      expect(totalFee).toBe(100);
      const zeroFees = fees.filter((f) => f === 0).length;
      const oneFees = fees.filter((f) => f === 1).length;
      expect(zeroFees + oneFees).toBe(102);
      expect(oneFees).toBe(100);
    });

    it('should use group fee when splitEqually is not active', () => {
      component.countPerStructure.set(2);
      component.fee.set(30);
      component.splitEqually.set(false);

      nextStepSubject.next();

      expect(wizardMock.addPropertyToStructure).toHaveBeenCalledTimes(4);
      const calls = wizardMock.addPropertyToStructure.calls.all();
      for (const call of calls) {
        expect(call.args[1].fee).toBe(30);
      }
    });
  });
});
