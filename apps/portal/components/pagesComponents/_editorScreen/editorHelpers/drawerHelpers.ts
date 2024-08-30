export const heartSceneFunc = function (context: any, shape: any) {
  context.beginPath();
  context.moveTo(30, 0);
  context.quadraticCurveTo(15, -13, 0, 0);
  context.quadraticCurveTo(-13, 15, 0, 30);
  context.lineTo(30, 60);
  context.lineTo(60, 30);
  context.quadraticCurveTo(73, 15, 60, 0);
  context.quadraticCurveTo(45, -13, 30, 0);
  context.closePath();
  context.fillStrokeShape(shape);
};
