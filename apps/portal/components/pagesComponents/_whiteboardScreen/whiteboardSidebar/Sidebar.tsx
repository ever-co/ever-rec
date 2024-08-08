/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-var */
import ScaleSelector from './components/ScaleSelector';
import mapicon from 'public/assets/svg/whiteboard-tools-panel/map.svg';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { Tabs } from 'antd';
import { Stage } from 'konva/lib/Stage';
import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import { MenuItem } from 'rc-menu';
import SubMenu from 'antd/lib/menu/SubMenu';
import {
  destroyPointerTransformer,
  initPointerTransformer,
} from '../whiteboardHelpers/WhiteboardTransformer';

interface ISidebarProps {
  stageScale: number;
  onStageScaleChange: (stageScale: number) => void;
  stageList: Stage[];
  setPointerTarget: (shape: any) => void;
}
const onClick: MenuProps['onClick'] = (e) => {
  console.log('click ', e);
};
// const goToFrame = (shape: any, stage: Stage) => {};

const WhiteboardSidebar: React.FC<ISidebarProps> = ({
  stageScale,
  onStageScaleChange,
  stageList,
  setPointerTarget,
}) => {
  return (
    <div className=" whiteboard-sidebar tw-shadow-md  tw-flex tw-items-center tw-w-280px tw-fixed tw-bg-white tw-pt-64px tw-right-20px tw-z-10 tw-h-full tw-flex tw-justify-between tw-flex-col">
      <div className=" tw-w-full tw-h-600px ">
        <Tabs defaultActiveKey="1" tabBarGutter={5}>
          <Tabs.TabPane className="" tab="Frames" key="1">
            {stageList.map((stage, index) => {
              return (
                <Menu
                  onClick={onClick}
                  // style={{ width: 256 }}
                  // defaultSelectedKeys={['1']}
                  // defaultOpenKeys={['sub1']}
                  mode="inline"
                  key={index}
                >
                  {stage.children[1].children.length > 0 ? (
                    <SubMenu
                      key={index}
                      title={'# Frame ' + (index + 1)}
                      className="tw-cursor-pointer"
                      onTitleClick={() => {
                        document
                          .getElementById(stage.getAttr('id'))
                          .scrollIntoView({
                            behavior: 'auto',
                            block: 'center',
                            inline: 'center',
                          });
                        setPointerTarget(null);
                        destroyPointerTransformer(stage);
                      }}
                      // onClick={() => {
                      //   document
                      //     .getElementById(stage.getAttr('id'))
                      //     .scrollIntoView({
                      //       behavior: 'auto',
                      //       block: 'end',
                      //       inline: 'center',
                      //     });
                      // }}
                    >
                      {stage.children[1].children.map((shape, index) => {
                        if (shape.getClassName() !== 'Transformer')
                          return (
                            <MenuItem
                              className="tw-cursor-pointer"
                              onClick={() => {
                                document
                                  .getElementById(stage.getAttr('id'))
                                  .scrollIntoView({
                                    behavior: 'auto',
                                    block: 'center',
                                    inline: 'center',
                                  });
                                setPointerTarget(shape);
                              }}
                              key={index}
                            >
                              {shape.getClassName() !== 'Transformer'
                                ? shape.getClassName() + ' ' + (index + 1)
                                : null}
                            </MenuItem>
                          );
                      })}
                    </SubMenu>
                  ) : (
                    <MenuItem
                      className="tw-cursor-pointer"
                      onClick={() => {
                        document
                          .getElementById(stage.getAttr('id'))
                          .scrollIntoView({
                            behavior: 'auto',
                            block: 'end',
                            inline: 'center',
                          });
                      }}
                    >
                      {'  # Frame '}
                      {index + 1}
                    </MenuItem>
                  )}
                </Menu>
              );
            })}

            {/* <Menu
              onClick={onClick}
              style={{ width: 256 }}
              defaultSelectedKeys={['1']}
              defaultOpenKeys={['sub1']}
              mode="inline"
              items={frames}
            /> */}
          </Tabs.TabPane>

          <Tabs.TabPane tab="Comments" key="2">
            Content of Tab Pane 2
          </Tabs.TabPane>
          <Tabs.TabPane tab="Tasks" key="3">
            Content of Tab Pane 3
          </Tabs.TabPane>
        </Tabs>
      </div>
      <div className="tw-border tw-border-iron-grey tw-w-full tw-h-40px">
        <div className="tw-text-xl tw-p-1 tw-flex tw-align-center tw-justify-between">
          <div className="tw-border-r tw-border-iron-grey tw-px-2 ">
            <Image src={mapicon} width={18} height={15} />
          </div>
          <ScaleSelector
            value={stageScale}
            min={25}
            max={200}
            suffix="%"
            step={25}
            onChange={onStageScaleChange}
            className="tw-text-xl tw-w-full"
          />
        </div>
      </div>
    </div>
  );
};
export default WhiteboardSidebar;
