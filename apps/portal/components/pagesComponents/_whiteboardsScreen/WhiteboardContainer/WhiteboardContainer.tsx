import React, { useRef } from 'react';
import { Col, Row } from 'antd';
import WhiteboardCard from './WhiteboardCard/WhiteboardCard';
import InfiniteScroll from 'react-infinite-scroll-component';
import useInfiniteScroll from 'hooks/useInfiniteScroll';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';

const fakeTeam = [
  { name: 'R', color: '#f56a00' },
  { name: 'K', color: '#87d068' },
  { name: 'D', color: '#1890ff' },
  { name: 'V', color: '#fde3cf' },
];

interface IProps {
  whiteboards: IWhiteboard[];
  currentTab: string;
}

const WhiteboardContainer: React.FC<IProps> = ({ whiteboards, currentTab }) => {
  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const { itemsToLoad, loadMoreItems } = useInfiniteScroll();

  return (
    <div
      className="scroll-div tw-overflow-y-auto mx-md:tw-h-90vh tw-w-full"
      id="scrollableDivItems"
      ref={scrollableDivRef}
    >
      <div className="tw-h-50px tw-w-full tw-border-b tw-border-1px tw-border-iron-grey tw-sticky tw-top-0 !tw-bg-white tw-z-20"></div>
      <div className="tw-w-full tw-h-full">
        <div className="tw-px-20 tw-py-10 tw-w-full">
          <InfiniteScroll
            dataLength={itemsToLoad}
            next={loadMoreItems}
            hasMore={whiteboards?.length > itemsToLoad}
            loader={null}
            scrollableTarget="scrollableDivItems"
            className="scrollbar"
          >
            <Row className="tw-w-full" gutter={30}>
              {whiteboards?.map((whiteboard, index) => {
                if (!whiteboard.trash && currentTab === '1') {
                  return (
                    <Col key={index} xs={24} sm={24} md={24} lg={12} xxl={8}>
                      <WhiteboardCard whiteboard={whiteboard} team={fakeTeam} />
                    </Col>
                  );
                }

                if (
                  whiteboard.favorite &&
                  !whiteboard.trash &&
                  currentTab === '3'
                ) {
                  return (
                    <Col key={index} xs={24} sm={24} md={24} lg={12} xxl={8}>
                      <WhiteboardCard whiteboard={whiteboard} team={fakeTeam} />
                    </Col>
                  );
                }

                if (whiteboard.trash && currentTab === '7') {
                  return (
                    <Col key={index} xs={24} sm={24} md={24} lg={12} xxl={8}>
                      <WhiteboardCard
                        whiteboard={whiteboard}
                        team={fakeTeam}
                        isTrash
                      />
                    </Col>
                  );
                }
              })}
            </Row>
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
};
export default WhiteboardContainer;
