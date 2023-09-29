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

import { Card, CardTitle, CardBody, CardFooter } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';

export interface NotFoundCardProps {
  title: React.ReactNode;
  bodyText: React.ReactNode;
  linkText: React.ReactNode;
  linkPath: string;
}

export const NotFoundCard: React.FC<NotFoundCardProps> = ({ title, bodyText, linkText, linkPath }) => {
  return (
    <>
      <Card className="pf-c-card-not-found">
        <CardTitle>{title}</CardTitle>
        <CardBody>{bodyText}</CardBody>
        <CardFooter className="pf-c-card-not-found__footer">
          <Link to={linkPath}>{linkText}</Link>
        </CardFooter>
      </Card>
    </>
  );
};
