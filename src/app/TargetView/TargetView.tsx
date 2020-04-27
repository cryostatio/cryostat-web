import * as React from 'react';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';
import { BreadcrumbPage, BreadcrumbTrail } from '@app/BreadcrumbPage/BreadcrumbPage';

interface TargetViewProps {
  children?: any;
  pageTitle: string;
  compactSelect?: boolean;
  allowDisconnect?: boolean;
  breadcrumbs?: BreadcrumbTrail[];
}

export const TargetView = (props: TargetViewProps) => {
  return (<>
    <BreadcrumbPage pageTitle={props.pageTitle} breadcrumbs={props.breadcrumbs}>
      <TargetSelect isCompact={props.compactSelect == null ? true : props.compactSelect} allowDisconnect={props.allowDisconnect || false} isFilled={false} />
      { props.children }
    </BreadcrumbPage>
  </>);

}
