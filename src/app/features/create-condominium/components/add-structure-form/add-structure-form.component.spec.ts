import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SharedTestingModule } from '@testing/shared-testing.module';

import { AddStructureFormComponent } from './add-structure-form.component';

describe('AddStructureFormComponent', () => {
  let component: AddStructureFormComponent;
  let fixture: ComponentFixture<AddStructureFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedTestingModule, IonicModule.forRoot(), AddStructureFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddStructureFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
