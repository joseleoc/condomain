import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { languageSelectorComponent } from './language-selector.component';

describe('languageSelectorComponent', () => {
  let component: languageSelectorComponent;
  let fixture: ComponentFixture<languageSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), languageSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(languageSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
