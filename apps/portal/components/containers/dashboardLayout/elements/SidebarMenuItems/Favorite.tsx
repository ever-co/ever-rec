'use client';

import type React from 'react';
import styles from './SidebarItemsStyles.module.scss';
import { useState } from 'react';
import Link from 'next/link';
import AppSvg from 'components/elements/AppSvg';

export function Chevron(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 1024 1024"
      {...props}
    >
      <path
        fill="#000000"
        d="m488.832 344.32l-339.84 356.672a32 32 0 0 0 0 44.16l.384.384a29.44 29.44 0 0 0 42.688 0l320-335.872l319.872 335.872a29.44 29.44 0 0 0 42.688 0l.384-.384a32 32 0 0 0 0-44.16L535.168 344.32a32 32 0 0 0-46.336 0"
      ></path>
    </svg>
  );
}
interface AccordionItemProps {
  title: string;
  href: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

function AccordionItem({
  title,
  href,
  children,
  defaultOpen = false,
  icon,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <div className=" tw-flex tw-items-center tw-rounded-xl  tw-bg-[#383c44]/10 tw-w-[270px] tw-w-full tw-px-4 tw-py-4 tw-pl-[38px]">
        <div onClick={handleToggle} className="tw-cursor-pointer tw-mr-2">
          <AppSvg path="/sidebar/new/starred.svg" size="20px" />
        </div>
        <Link href={href} className={styles.title}>
          {title}
        </Link>
        <div
          onClick={(e) => {
            e.preventDefault();
            handleToggle(e);
          }}
        >
          {isOpen ? (
            <Chevron className="tw-w-4 tw-h-4 tw-text-gray-500 " />
          ) : (
            <Chevron className="tw-w-4 tw-h-4 tw-text-gray-500 tw-rotate-180" />
          )}
        </div>
      </div>
      {isOpen && <div className="tw-px-4 tw-py-2 tw-pl-10">{children}</div>}
    </div>
  );
}

interface NavItemProps {
  href: string;
  children: React.ReactNode;
}

function NavItem({ href, children }: NavItemProps) {
  return (
    <Link href={href} className="tw-block tw-py-1  ">
      {children}
    </Link>
  );
}

export function CustomAccordion({ icon, title }: any) {
  return (
    <div className="  tw-overflow-hidden ">
      <AccordionItem
        title="Favorites"
        href="/media/favorites"
        icon={icon}
        defaultOpen={true}
      >
        <ul className="space-y-2">
          <li>
            <NavItem href="/todos">TODOs</NavItem>
          </li>
          <li>
            <NavItem href="/testing">Testing component</NavItem>
          </li>
          <li>
            <NavItem href="/tttt">TTTT</NavItem>
          </li>
        </ul>
      </AccordionItem>
    </div>
  );
}

export default function Home() {
  return <CustomAccordion />;
}
