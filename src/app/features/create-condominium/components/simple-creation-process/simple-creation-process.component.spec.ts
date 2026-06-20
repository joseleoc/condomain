import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents, TELEMETRY_ENABLED } from '@core/services/telemetry/telemetry.types';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { SimpleCreationProcessComponent } from './simple-creation-process.component';

describe('SimpleCreationProcessComponent', () => {
  let component: SimpleCreationProcessComponent;
  let fixture: ComponentFixture<SimpleCreationProcessComponent>;
  let wizardMock: jasmine.SpyObj<Wizard>;
  let telemetryMock: jasmine.SpyObj<TelemetryService>;

  beforeEach(async () => {
    wizardMock = jasmine.createSpyObj('Wizard', ['saveStructureLocally', 'selectedStructure'], {
      structures$: new BehaviorSubject([]),
    });
    wizardMock.saveStructureLocally.and.returnValue(true);
    telemetryMock = jasmine.createSpyObj('TelemetryService', ['track']);

    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), SimpleCreationProcessComponent],
      providers: [
        { provide: TELEMETRY_ENABLED, useValue: true },
        { provide: Wizard, useValue: wizardMock },
        { provide: TelemetryService, useValue: telemetryMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleCreationProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should track structure_added when submitAddStructureForm succeeds', () => {
    wizardMock.structures$.next([{ name: 'Tower A', description: '', properties: [] }]);

    // Mock the viewChild signal to return a fake form component
    const fakeFormComponent = {
      submitAddStructureForm: jasmine.createSpy('submit').and.returnValue({
        name: 'Tower A',
        description: '',
      }),
    };
    (component as any).addStructureFormComponent = signal(fakeFormComponent);

    component.submitAddStructureForm();

    expect(telemetryMock.track).toHaveBeenCalledWith(
      TelemetryEvents.STRUCTURE_ADDED,
      jasmine.objectContaining({ mode: 'simple' }),
    );
  });
});
