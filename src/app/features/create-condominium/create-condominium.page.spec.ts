import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateCondominiumPage } from './create-condominium.page';

describe('CreateCondominiumPage', () => {
  let component: CreateCondominiumPage;
  let fixture: ComponentFixture<CreateCondominiumPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateCondominiumPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
