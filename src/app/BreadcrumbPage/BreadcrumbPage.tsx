import * as React from 'react';
import { Breadcrumb, BreadcrumbHeading, BreadcrumbItem, PageSection, Stack, StackItem } from '@patternfly/react-core';

interface BreadcrumbPageProps {
  pageTitle: string;
  breadcrumbs?: BreadcrumbTrail[];
}

export interface BreadcrumbTrail {
  title: string;
  path: string;
}

export const BreadcrumbPage: React.FunctionComponent<BreadcrumbPageProps> = (props) => {
  return (<>
    <PageSection>
      <Breadcrumb>
        {(props.breadcrumbs || []).map(({ title, path }) => (<BreadcrumbItem key={path} to={path}>{title}</BreadcrumbItem>))}
        <BreadcrumbHeading>{props.pageTitle}</BreadcrumbHeading>
      </Breadcrumb>
      <Stack gutter="md">
        {
          React.Children.map(props.children, child => (
            <StackItem isFilled={child && child['isFilled']}>
              {child}
            </StackItem>
          ))
        }
      </Stack>
    </PageSection>
  </>);

}
