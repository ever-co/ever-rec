/* eslint-disable no-var */
import Konva from 'konva';

var GUIDELINE_OFFSET = 5;

export function drawGuides(guides: Array<any>, drawLayer: Konva.Layer) {
  guides.forEach((lg) => {
    if (lg.orientation === 'H') {
      var line = new Konva.Line({
        points: [-6000, 0, 6000, 0],
        stroke: 'white',
        listening: false,
        shadowColor: 'rgb(91, 77, 190)',
        shadowBlur: 1,
        shadowOffset: { x: 1, y: 1 },
        strokeWidth: 1,
        name: 'guid-line',
        dash: [4, 6],
      });
      drawLayer.add(line);
      line.absolutePosition({
        x: 0,
        y: lg.lineGuide,
      });
    } else if (lg.orientation === 'V') {
      var line = new Konva.Line({
        points: [0, -6000, 0, 6000],
        stroke: 'white',
        listening: false,
        shadowColor: 'rgb(91, 77, 190)',
        shadowBlur: 1,
        shadowOffset: { x: 1, y: 1 },
        strokeWidth: 1,
        name: 'guid-line',
        dash: [4, 6],
      });
      drawLayer.add(line);
      line.absolutePosition({
        x: lg.lineGuide,
        y: 0,
      });
    }
  });
}

export function getGuides(lineGuideStops, itemBounds) {
  var resultV: any[] = [];
  var resultH: any[] = [];

  lineGuideStops.vertical.forEach((lineGuide) => {
    itemBounds.vertical.forEach((itemBound) => {
      var diff = Math.abs(lineGuide - itemBound.guide);
      // if the distance between guild line and object snap point is close we can consider this for snapping
      if (diff < GUIDELINE_OFFSET) {
        resultV.push({
          lineGuide: lineGuide,
          diff: diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        });
      }
    });
  });

  lineGuideStops.horizontal.forEach((lineGuide) => {
    itemBounds.horizontal.forEach((itemBound) => {
      var diff = Math.abs(lineGuide - itemBound.guide);
      if (diff < GUIDELINE_OFFSET) {
        resultH.push({
          lineGuide: lineGuide,
          diff: diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        });
      }
    });
  });

  var guides: any[] = [];

  // find closest snap
  var minV = resultV.sort((a, b) => a.diff - b.diff)[0];
  var minH = resultH.sort((a, b) => a.diff - b.diff)[0];
  if (minV) {
    guides.push({
      lineGuide: minV.lineGuide,
      offset: minV.offset,
      orientation: 'V',
      snap: minV.snap,
    });
  }
  if (minH) {
    guides.push({
      lineGuide: minH.lineGuide,
      offset: minH.offset,
      orientation: 'H',
      snap: minH.snap,
    });
  }
  return guides;
}

export function getObjectSnappingEdges(node) {
  var box = node?.getClientRect();
  var absPos = node?.absolutePosition();

  return {
    vertical: [
      {
        guide: Math.round(box?.x),
        offset: Math.round(absPos?.x - box?.x),
        snap: 'start',
      },
      {
        guide: Math.round(box?.x + box?.width / 2),
        offset: Math.round(absPos?.x - box?.x - box?.width / 2),
        snap: 'center',
      },
      {
        guide: Math.round(box?.x + box?.width),
        offset: Math.round(absPos?.x - box?.x - box?.width),
        snap: 'end',
      },
    ],
    horizontal: [
      {
        guide: Math.round(box?.y),
        offset: Math.round(absPos?.y - box?.y),
        snap: 'start',
      },
      {
        guide: Math.round(box?.y + box?.height / 2),
        offset: Math.round(absPos?.y - box?.y - box?.height / 2),
        snap: 'center',
      },
      {
        guide: Math.round(box?.y + box?.height),
        offset: Math.round(absPos?.y - box?.y - box?.height),
        snap: 'end',
      },
    ],
  };
}

export function getLineGuideStops(skipShape: any, current_stage: Konva.Stage) {
  // we can snap to stage borders and the center of the stage
  var vertical = [[0, current_stage.width() / 2, current_stage.width()]];
  var horizontal = [[0, current_stage.height() / 2, current_stage.height()]];

  // and we snap over edges and center of each object on the canvas
  current_stage.find('.drawn').forEach((guideItem) => {
    if (guideItem === skipShape) {
      return;
    }
    var box = guideItem.getClientRect();
    // and we can snap to all edges of shapes
    vertical.push([box.x, box.x + box.width, box.x + box.width / 2]);
    horizontal.push([box.y, box.y + box.height, box.y + box.height / 2]);
  });
  return {
    vertical: vertical.flat(),
    horizontal: horizontal.flat(),
  };
}

export const guidesMove = (guides: Array<any>, absPos) => {
  guides.forEach((lg) => {
    switch (lg.snap) {
      case 'start': {
        switch (lg.orientation) {
          case 'V': {
            absPos.x = lg.lineGuide + lg.offset;
            break;
          }
          case 'H': {
            absPos.y = lg.lineGuide + lg.offset;
            break;
          }
        }
        break;
      }
      case 'center': {
        switch (lg.orientation) {
          case 'V': {
            absPos.x = lg.lineGuide + lg.offset;
            break;
          }
          case 'H': {
            absPos.y = lg.lineGuide + lg.offset;
            break;
          }
        }
        break;
      }
      case 'end': {
        switch (lg.orientation) {
          case 'V': {
            absPos.x = lg.lineGuide + lg.offset;
            break;
          }
          case 'H': {
            absPos.y = lg.lineGuide + lg.offset;
            break;
          }
        }
        break;
      }
    }
  });
};
