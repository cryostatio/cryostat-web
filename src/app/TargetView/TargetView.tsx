import * as React from 'react';
import { BreadcrumbPage, BreadcrumbTrail } from '@app/BreadcrumbPage/BreadcrumbPage';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';

interface TargetViewProps {
  pageTitle: string;
  compactSelect?: boolean;
  allowDisconnect?: boolean;
  breadcrumbs?: BreadcrumbTrail[];
}

export const TargetView: React.FunctionComponent<TargetViewProps> = (props) => {
  return (<>
    <BreadcrumbPage pageTitle={props.pageTitle} breadcrumbs={props.breadcrumbs}>
      <TargetSelect isCompact={props.compactSelect == null ? true : props.compactSelect} allowDisconnect={props.allowDisconnect || false} isFilled={false} />
      { props.children }
    </BreadcrumbPage>
  </>);

}
