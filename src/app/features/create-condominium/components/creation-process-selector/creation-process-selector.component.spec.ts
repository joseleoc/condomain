import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { TranslocoService } from '@jsverse/transloco';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { CreationProcessSelectorComponent } from './creation-process-selector.component';

describe('CreationProcessSelectorComponent', () => {
  let component: CreationProcessSelectorComponent;
  let fixture: ComponentFixture<CreationProcessSelectorComponent>;
  let wizardMock: jasmine.SpyObj<Wizard>;
  let translocoMock: jasmine.SpyObj<TranslocoService>;
  let telemetryMock: jasmine.SpyObj<TelemetryService>;

  beforeEach(async () => {
    wizardMock = jasmine.createSpyObj('Wizard', [], {
      nextStep$: new BehaviorSubject<void>(undefined),
    });
    const langChanges$ = new BehaviorSubject('en');
    translocoMock = {
      translate: jasmine.createSpy('translate').and.callFake((key: string) => key),
      langChanges$: langChanges$.asObservable(),
      config: { reRenderOnLangChange: false },
    } as unknown as jasmine.SpyObj<TranslocoService>;
    telemetryMock = jasmine.createSpyObj('TelemetryService', ['track']);

    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), CreationProcessSelectorComponent],
      providers: [
        { provide: Wizard, useValue: wizardMock },
        { provide: TranslocoService, useValue: translocoMock },
        { provide: TelemetryService, useValue: telemetryMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreationProcessSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should track wizard_mode_selected when handleSubmit is called with a selection', () => {
    component.selectedOption.set('simple');

    component.handleSubmit();

    expect(telemetryMock.track).toHaveBeenCalledWith(
      TelemetryEvents.WIZARD_MODE_SELECTED,
      jasmine.objectContaining({ mode: 'simple' }),
    );
  });

  it('should not track wizard_mode_selected when no option is selected', () => {
    component.selectedOption.set(null);

    component.handleSubmit();

    expect(telemetryMock.track).not.toHaveBeenCalled();
  });
});
