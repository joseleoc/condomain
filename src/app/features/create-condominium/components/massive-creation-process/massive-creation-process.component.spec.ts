import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject, Subject } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { Toast } from '@core/services/toast/toast';
import { TranslocoService } from '@jsverse/transloco';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

import { MassiveCreationProcessComponent } from './massive-creation-process.component';

describe('MassiveCreationProcessComponent', () => {
  let component: MassiveCreationProcessComponent;
  let fixture: ComponentFixture<MassiveCreationProcessComponent>;
  let wizardMock: jasmine.SpyObj<Wizard>;
  let toastMock: jasmine.SpyObj<Toast>;
  let translocoMock: jasmine.SpyObj<TranslocoService>;
  let telemetryMock: jasmine.SpyObj<TelemetryService>;
  let nextStepSubject: Subject<number>;

  beforeEach(async () => {
    nextStepSubject = new Subject<number>();
    wizardMock = jasmine.createSpyObj('Wizard', ['saveStructureLocally', 'setStep', 'selectedStructure'], {
      structures$: new BehaviorSubject([]),
      nextStep$: nextStepSubject.asObservable(),
      creationProcessSelected: () => 'massive',
    });
    wizardMock.saveStructureLocally.and.returnValue(true);
    toastMock = jasmine.createSpyObj('Toast', ['present']);
    const langChanges$ = new BehaviorSubject('en');
    translocoMock = {
      translate: jasmine.createSpy('translate').and.callFake((key: string) => key),
      langChanges$: langChanges$.asObservable(),
      config: { reRenderOnLangChange: false },
    } as unknown as jasmine.SpyObj<TranslocoService>;
    telemetryMock = jasmine.createSpyObj('TelemetryService', ['track']);

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), MassiveCreationProcessComponent],
      providers: [
        { provide: Wizard, useValue: wizardMock },
        { provide: Toast, useValue: toastMock },
        { provide: TranslocoService, useValue: translocoMock },
        { provide: TelemetryService, useValue: telemetryMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MassiveCreationProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should track structure_generation_completed after pattern generates structures', () => {
    // Set up to trigger the generation path
    component.showingGenerator.set(true);
    component.patternOrder.set(['prefix', 'num']);
    component.prefixText.set('Torre ');
    component.count.set(3);
    component.startAtNum.set(1);
    component.digits.set(1);

    // Trigger nextStep which runs the generation
    nextStepSubject.next(2);

    expect(telemetryMock.track).toHaveBeenCalledWith(
      TelemetryEvents.STRUCTURE_GENERATION_COMPLETED,
      jasmine.objectContaining({ count: 3, mode: 'massive' }),
    );
  });
});
