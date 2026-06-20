import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { CreatePropertyFormComponent } from './create-property-form.component';

describe('CreatePropertyFormComponent', () => {
  let component: CreatePropertyFormComponent;
  let fixture: ComponentFixture<CreatePropertyFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), CreatePropertyFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePropertyFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
