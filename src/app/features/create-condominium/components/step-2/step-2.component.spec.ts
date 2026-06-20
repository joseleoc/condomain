import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject, Subject } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { Toast } from '@core/services/toast/toast';
import { TranslocoService } from '@jsverse/transloco';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

import { Step2Component } from './step-2.component';

describe('Step2Component', () => {
  let component: Step2Component;
  let fixture: ComponentFixture<Step2Component>;
  let wizardMock: jasmine.SpyObj<Wizard>;
  let toastMock: jasmine.SpyObj<Toast>;
  let translocoMock: jasmine.SpyObj<TranslocoService>;
  let telemetryMock: jasmine.SpyObj<TelemetryService>;
  let nextStepSubject: Subject<number>;

  beforeEach(waitForAsync(() => {
    nextStepSubject = new Subject<number>();
    wizardMock = jasmine.createSpyObj('Wizard', ['setStep'], {
      nextStep$: nextStepSubject.asObservable(),
      structures$: new BehaviorSubject([]),
      creationProcessSelected: () => null,
    });
    toastMock = jasmine.createSpyObj('Toast', ['present']);
    const langChanges$ = new BehaviorSubject('en');
    translocoMock = {
      translate: jasmine.createSpy('translate').and.callFake((key: string) => key),
      langChanges$: langChanges$.asObservable(),
      config: { reRenderOnLangChange: false },
    } as unknown as jasmine.SpyObj<TranslocoService>;
    telemetryMock = jasmine.createSpyObj('TelemetryService', ['track']);

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), Step2Component],
      providers: [
        { provide: Wizard, useValue: wizardMock },
        { provide: Toast, useValue: toastMock },
        { provide: TranslocoService, useValue: translocoMock },
        { provide: TelemetryService, useValue: telemetryMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should track wizard_error on validation failure when no structures and no mode', () => {
    (wizardMock.structures$ as BehaviorSubject<unknown[]>).next([]);

    // First trigger shows toast without tracking (first time flag)
    nextStepSubject.next(2);
    expect(toastMock.present).not.toHaveBeenCalled();
    expect(telemetryMock.track).not.toHaveBeenCalled();

    // Second trigger shows toast AND tracks error
    nextStepSubject.next(2);

    expect(toastMock.present).toHaveBeenCalled();
    expect(telemetryMock.track).toHaveBeenCalledWith(
      TelemetryEvents.WIZARD_ERROR,
      jasmine.objectContaining({
        error_type: 'validation',
        step: 2,
      }),
    );
  });
});
