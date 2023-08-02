/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  Breadcrumb,
  BreadcrumbHeading,
  BreadcrumbItem,
  PageGroup,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbPageProps {
  pageTitle: string;
  breadcrumbs?: BreadcrumbTrail[];
  children?: React.ReactNode;
}

export interface BreadcrumbTrail {
  title: string;
  path: string;
}

export const BreadcrumbPage: React.FC<BreadcrumbPageProps> = (props) => {
  return (
    <PageGroup>
      <PageSection>
        <Breadcrumb>
          {(props.breadcrumbs || []).map(({ title, path }) => (
            <BreadcrumbItem key={path}>
              <Link to={path}>{title}</Link>
            </BreadcrumbItem>
          ))}
          <BreadcrumbHeading>{props.pageTitle}</BreadcrumbHeading>
        </Breadcrumb>
        <Stack hasGutter={true}>
          {React.Children.map(props.children, (child) => (
            <StackItem isFilled={isItemFilled(child)}>{child}</StackItem>
          ))}
        </Stack>
      </PageSection>
    </PageGroup>
  );
};

export const isItemFilled = (item: React.ReactNode): boolean => {
  if (!item) return false;
  const toCheck = item['props'] ? item['props'] : item;
  return toCheck['isFilled'] || toCheck['isFullHeight'] || toCheck['data-full-height'];
};
