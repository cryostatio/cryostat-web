import * as React from 'react';
import { Breadcrumb, BreadcrumbHeading, BreadcrumbItem, PageSection, Stack, StackItem, } from '@patternfly/react-core';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';

interface TargetViewProps {
  children?: any;
  pageTitle: string;
  compactSelect?: boolean;
  allowDisconnect?: boolean;
  breadcrumbs?: BreadcrumbTrail[];
}

export interface BreadcrumbTrail {
  title: string;
  path: string;
}

export const TargetView = (props: TargetViewProps) => {
  return (<>
    <PageSection>
      <Breadcrumb>
        {(props.breadcrumbs || []).map(({ title, path }) => (<BreadcrumbItem to={path}>{title}</BreadcrumbItem>))}
        <BreadcrumbHeading>{props.pageTitle}</BreadcrumbHeading>
      </Breadcrumb>
      <Stack gutter="md">
        <StackItem>
          <TargetSelect isCompact={props.compactSelect == null ? true : props.compactSelect} allowDisconnect={props.allowDisconnect || false} />
        </StackItem>
        {
          React.Children.map(props.children, child => (
            <StackItem isFilled>
              {child}
            </StackItem>
          ))
        }
      </Stack>
    </PageSection>
  </>);

}
