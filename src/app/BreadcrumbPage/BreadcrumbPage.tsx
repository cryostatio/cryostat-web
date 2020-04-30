import * as React from 'react';
import { Breadcrumb, BreadcrumbHeading, BreadcrumbItem, PageSection, Stack, StackItem, } from '@patternfly/react-core';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';

interface BreadcrumbPageProps {
  children?: { isFilled?: boolean };
  pageTitle: string;
  breadcrumbs?: BreadcrumbTrail[];
}

export interface BreadcrumbTrail {
  title: string;
  path: string;
}

export const BreadcrumbPage = (props: BreadcrumbPageProps) => {
  return (<>
    <PageSection>
      <Breadcrumb>
        {(props.breadcrumbs || []).map(({ title, path }) => (<BreadcrumbItem to={path}>{title}</BreadcrumbItem>))}
        <BreadcrumbHeading>{props.pageTitle}</BreadcrumbHeading>
      </Breadcrumb>
      <Stack gutter="md">
        {
          React.Children.map(props.children, child => (
            <StackItem isFilled={!!child && child.isFilled}>
              {child}
            </StackItem>
          ))
        }
      </Stack>
    </PageSection>
  </>);

}
