import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { PropertiesListEmptyComponent } from './properties-list-empty.component';

describe('PropertiesListEmptyComponent', () => {
  let component: PropertiesListEmptyComponent;
  let fixture: ComponentFixture<PropertiesListEmptyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), PropertiesListEmptyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PropertiesListEmptyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
