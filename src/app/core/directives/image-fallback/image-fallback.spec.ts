import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageFallback } from './image-fallback';

@Component({
  template: `<img [src]="imgSrc" withFallbackImage [src]="'real.jpg'" [default]="'fallback.jpg'" />`,
  imports: [ImageFallback],
})
class TestHostComponent {
  imgSrc = 'real.jpg';
}

describe('ImageFallback', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
