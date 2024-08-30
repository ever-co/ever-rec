import jsPDF from 'jspdf';
import { Stage } from 'konva/lib/Stage';

export const pdfFormation = (stage: Stage): Blob => {
  const width = stage.width();
  const height = stage.height();
  const orientation = width > height ? 'l' : 'p';
  const pdf = new jsPDF(orientation, 'px', [stage.width(), stage.height()]);
  pdf.addImage(stage.toDataURL(), 0, 0, stage.width(), stage.height());
  const blob: Blob = pdf.output('blob');
  return blob;
};
