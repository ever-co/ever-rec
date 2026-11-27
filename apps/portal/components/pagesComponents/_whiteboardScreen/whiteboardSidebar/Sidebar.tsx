/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-var */
import ScaleSelector from './components/ScaleSelector';
import mapicon from 'public/assets/svg/whiteboard-tools-panel/map.svg';
import Image from 'next/legacy/image';
import React, { useEffect, useState } from 'react';
import { Tabs } from 'antd';
import { Stage } from 'konva/lib/Stage';
import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import {
  destroyPointerTransformer,
  initPointerTransformer,
} from '../whiteboardHelpers/WhiteboardTransformer';

// From antd's own Menu: an item imported from `rc-menu` (or from `antd/lib`) can come from another
// copy of the module, finds no menu around it and the page stops with an error.
const { Item: MenuItem, SubMenu } = Menu;

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
    <div className=" whiteboard-sidebar tw-flex tw-items-center tw-w-280px tw-fixed tw-bg-card tw-border-l tw-border-r tw-border-border tw-pt-60px tw-right-20px tw-z-10 tw-h-full tw-flex tw-justify-between tw-flex-col">
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
                  // The list sits on the panel's ground; the panel draws the hairlines.
                  style={{ background: 'transparent', borderRight: 0 }}
                >
                  {stage.children[1].children.length > 0 ? (
                    <SubMenu
                      key={index}
                      title={'# Frame ' + (index + 1)}
                      className="tw-cursor-pointer"
                      onTitleClick={() => {
                        document
                          .getElementById(stage.getAttr('id'))
                          ?.scrollIntoView({
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
                                  ?.scrollIntoView({
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
                      key={`frame-${index}`}
                      className="tw-cursor-pointer"
                      onClick={() => {
                        document
                          .getElementById(stage.getAttr('id'))
                          ?.scrollIntoView({
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
      <div className="tw-border-t tw-border-border tw-w-full tw-h-40px">
        <div className="tw-h-full tw-text-xl tw-p-1 tw-flex tw-items-stretch tw-justify-between">
          <div className="tw-flex tw-items-center tw-border-r tw-border-border tw-px-2">
            <Image
              src={mapicon}
              width={18}
              height={15}
              alt="mapicon"
              className="dark:tw-invert"
            />
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
