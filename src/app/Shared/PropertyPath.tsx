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
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import _ from 'lodash';
import React from 'react';

export interface PropertyPathProps {
  kind: string;
  path: string | string[];
}

export const PropertyPath: React.FC<PropertyPathProps> = ({ kind, path, ...props }) => {
  const pathArray: string[] = _.toPath(path);

  return (
    <Breadcrumb {...props}>
      <BreadcrumbItem>{kind}</BreadcrumbItem>
      {pathArray.map((property, i) => {
        return (
          <BreadcrumbItem key={`${property}-${i}`} isActive={i === pathArray.length - 1}>
            {property}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
};
