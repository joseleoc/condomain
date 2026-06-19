import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { Toast } from '@core/services/toast/toast';
import { MassivePropertyCreationComponent } from './massive-property-creation.component';
import { BehaviorSubject, of } from 'rxjs';

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
      imports: [IonicModule.forRoot(), MassivePropertyCreationComponent],
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
    expect(component.includeShort()).toBeTrue();
    expect(component.includeNum()).toBeTrue();

    component.togglePart('name');
    expect(component.includeName()).toBeTrue();

    component.togglePart('short');
    expect(component.includeShort()).toBeFalse();

    component.togglePart('num');
    expect(component.includeNum()).toBeFalse();
  });

  it('should generate names using toggled parts and separator', () => {
    component.includeName.set(true);
    component.includeShort.set(true);
    component.includeNum.set(true);
    component.customSeparator.set(' - ');
    component.countPerStructure.set(2);
    component.startAt.set(1);
    component.enumeratorType.set('number');
    component.digits.set(2);

    const names = component['generateNames']('Torre A');

    expect(names.length).toBe(2);
    expect(names[0]).toBe('Torre A - A - 01');
    expect(names[1]).toBe('Torre A - A - 02');
  });

  it('should generate names with only short and number by default', () => {
    component.countPerStructure.set(2);
    component.startAt.set(1);
    component.enumeratorType.set('number');
    component.digits.set(2);

    const names = component['generateNames']('Edificio Central');

    expect(names.length).toBe(2);
    expect(names[0]).toBe('Central01');
    expect(names[1]).toBe('Central02');
  });

  it('should generate letter-based enumerators', () => {
    component.countPerStructure.set(3);
    component.enumeratorType.set('letter');
    component.startAt.set(1);

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
    expect(component.nameTemplate()).toBe('{name}{short}{num}');

    component.togglePart('short');
    expect(component.nameTemplate()).toBe('{name}{num}');
  });

  it('should apply separator in nameTemplate', () => {
    component.customSeparator.set(' ');
    expect(component.nameTemplate()).toBe('{short} {num}');

    component.includeName.set(true);
    expect(component.nameTemplate()).toBe('{name} {short} {num}');
  });
});
