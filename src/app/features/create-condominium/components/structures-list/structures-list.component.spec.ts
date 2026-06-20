import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Wizard } from '@features/create-condominium/services/wizard/wizard';
import { TranslocoService } from '@jsverse/transloco';
import { AlertController } from '@ionic/angular/standalone';
import { TelemetryService } from '@core/services/telemetry';
import { TelemetryEvents } from '@core/services/telemetry/telemetry.types';

import { StructuresListComponent } from './structures-list.component';

describe('StructuresListComponent', () => {
  let component: StructuresListComponent;
  let fixture: ComponentFixture<StructuresListComponent>;
  let wizardMock: jasmine.SpyObj<Wizard>;
  let translocoMock: jasmine.SpyObj<TranslocoService>;
  let alertControllerMock: jasmine.SpyObj<AlertController>;
  let telemetryMock: jasmine.SpyObj<TelemetryService>;

  beforeEach(waitForAsync(() => {
    wizardMock = jasmine.createSpyObj('Wizard', [], {
      structures$: new BehaviorSubject([]),
    });
    const langChanges$ = new BehaviorSubject('en');
    translocoMock = {
      translate: jasmine.createSpy('translate').and.callFake((key: string) => key),
      langChanges$: langChanges$.asObservable(),
      config: { reRenderOnLangChange: false },
    } as unknown as jasmine.SpyObj<TranslocoService>;
    alertControllerMock = jasmine.createSpyObj('AlertController', ['create']);
    telemetryMock = jasmine.createSpyObj('TelemetryService', ['track']);

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), StructuresListComponent],
      providers: [
        { provide: Wizard, useValue: wizardMock },
        { provide: TranslocoService, useValue: translocoMock },
        { provide: AlertController, useValue: alertControllerMock },
        { provide: TelemetryService, useValue: telemetryMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StructuresListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should track structure_deleted when confirmDeleteStructure is called', () => {
    wizardMock.structures$.next([
      { name: 'Tower A', description: '', properties: [] },
      { name: 'Tower B', description: '', properties: [] },
    ]);

    component['confirmDeleteStructure']('Tower A');

    expect(telemetryMock.track).toHaveBeenCalledWith(
      TelemetryEvents.STRUCTURE_DELETED,
      jasmine.objectContaining({ structures_count: 1 }),
    );
  });
});
