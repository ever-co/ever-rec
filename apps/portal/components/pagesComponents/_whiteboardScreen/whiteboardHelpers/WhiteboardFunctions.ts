import Konva from 'konva';
import { Stage } from 'konva/lib/Stage';
import classNames from 'classnames';

/* eslint-disable no-var */

export const createNewStage = (
  stageList: Stage[],
  setCurrentStage: (stage: Stage) => void,
  setStageList: (stageList: Stage[]) => void,
  frameContainer,
) => {
  var uniqueId = Math.random().toString(36).substr(2, 9);
  const frame = document.createElement('div');
  frame.className = 'frames tw-mb-60px';
  frame.style.setProperty('position', 'relative');
  frame.style.setProperty('width', '1000px');
  frame.style.setProperty('height', '800px');
  const label = document.createElement('p');
  label.innerHTML = `Frame ${stageList.length + 1}`;
  frame.appendChild(label);
  const base = document.createElement('div');
  base.id = uniqueId;
  base.className = `${classNames(
    'tw-shadow-xl tw-bg-white tw-border-4 tw-border-trans',
  )}`;
  base.onmouseenter = () => {
    setCurrentStage(stage);
    base.className = 'tw-shadow-xl tw-bg-white  tw-border-4 !tw-border-sub-btn';
  };

  base.onmouseleave = () => {
    base.className = 'tw-shadow-xl tw-bg-white tw-border-4 tw-border-trans';
  };
  frame.appendChild(base);

  frameContainer.current.appendChild(frame);
  const stage = new Konva.Stage({
    id: uniqueId,
    container: uniqueId,
  });
  stage.width(1000);
  stage.height(800);
  const backLayer = new Konva.Layer({ id: 'backLayer' });
  const drawLayer = new Konva.Layer({ id: 'drawLayer' });
  stage.add(backLayer);
  stage.add(drawLayer);

  setCurrentStage(stage);
  setStageList([...stageList, stage]);
  base.scrollIntoView();
};
