import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { Toast } from '@core/services/toast/toast';
import { MassivePropertyCreationComponent } from './massive-property-creation.component';
import { BehaviorSubject } from 'rxjs';
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
    ], {
      structures$: new BehaviorSubject([]),
      nextStep$: new BehaviorSubject<void>(undefined),
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
});
