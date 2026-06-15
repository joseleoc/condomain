import { Component, input, OnInit, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

/**
 *  This component handles avatar image uploading, resizing, and previewing.
 *
 *
 * It allows users to select an image file, which is then resized to a maximum of 150x150 pixels while maintaining the aspect ratio. The resized image is displayed as a preview and emitted as a File object for further processing (e.g., uploading to a server).
 * @input imagePreview - A base64 string or URL for the initial image preview. This can be used to display an existing avatar before the user selects a new one.
 * @emits fileSelected - Emits the resized image file when a new image is selected and processed.
 *
 */
@Component({
  selector: 'app-avatar-uploader',
  templateUrl: './avatar-uploader.component.html',
  styleUrls: ['./avatar-uploader.component.scss'],
  imports: [IonIcon],
})
export class AvatarUploaderComponent {
  // --- Inputs ---
  imagePreview = input<string | ArrayBuffer | null>(null);
  // --- Outputs ---
  fileSelected = output<File | null>();

  // --- Properties ---
  localImagePreview = signal<string | ArrayBuffer | null>(this.imagePreview());

  // --- Methods ---
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const file = input.files[0];

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          // Resize the image and emit the resized file
          this.resizeImage(img, file.name, file.type);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  resizeImage(img: HTMLImageElement, fileName: string, fileType: string): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const MAX_WIDTH = 150;
    const MAX_HEIGHT = 150;
    let width = img.width;
    let height = img.height;

    // Calculate the new dimensions while maintaining the aspect ratio
    if (width > height) {
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
      }
    }

    // Set the canvas size
    canvas.width = width;
    canvas.height = height;

    if (ctx) {
      // Draw the scaled image on the canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert the canvas to a Blob (optimized file)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 1. Save the local preview with the already cropped/resized image
            this.localImagePreview.set(canvas.toDataURL(fileType));

            // 2. Create a new file to send to the server
            const resizedFile = new File([blob], fileName, {
              type: fileType,
              lastModified: Date.now(),
            });

            // 3. Emit the final 150px file
            this.fileSelected.emit(resizedFile);
          }
        },
        fileType,
        0.85,
      ); // 0.85 is the compression quality (85%)
    }
  }
}
