import jsPDF from 'jspdf';

export const pdfFromImageUrl = async (url: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const image = new Image();
      image.onload = function () {
        const width = image.width;
        const height = image.height;
        const orientation = width > height ? 'l' : 'p';
        const pdf = new jsPDF(orientation, 'px', [width, height]);
        pdf.addImage(image, 0, 0, width, height);
        const blob: Blob = pdf.output('blob');
        resolve(blob);
      };
      image.src = url;
    } catch (e: any) {
      reject(e.message);
    }
  });
};
