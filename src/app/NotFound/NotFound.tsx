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
import '@app/app.css';
import { IAppRoute, routes, flatten } from '@app/routes';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateSecondaryActions,
  Title,
} from '@patternfly/react-core';
import { MapMarkedAltIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Link } from 'react-router-dom-v5-compat';
import { NotFoundCard } from './NotFoundCard';

export interface NotFoundProps {}

export const NotFound: React.FC<NotFoundProps> = (_) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [activeLevel, setActiveLevel] = React.useState(FeatureLevel.PRODUCTION);

  React.useLayoutEffect(() => {
    addSubscription(context.settings.featureLevel().subscribe((featureLevel) => setActiveLevel(featureLevel)));
  }, [addSubscription, context.settings, setActiveLevel]);

  const cards = flatten(routes)
    .filter((route: IAppRoute): boolean => !!route.description)
    .filter((r) => r.featureLevel === undefined || r.featureLevel >= activeLevel)
    .sort((a: IAppRoute, b: IAppRoute): number => a.title.localeCompare(b.title))
    .map((route: IAppRoute) => (
      <NotFoundCard
        key={route.title}
        title={route.title}
        bodyText={route.description}
        linkText={`View ${route.title.toLocaleLowerCase()}`}
        linkPath={route.path}
      />
    ));

  return (
    <>
      <EmptyState className="pf-c-empty-state-not-found">
        <EmptyStateIcon icon={MapMarkedAltIcon} />
        <Title headingLevel="h4" size="lg">
          404: We couldn&apos;t find that page
        </Title>
        <EmptyStateBody>One of the following pages might have what you&apos;re looking for.</EmptyStateBody>
        <EmptyStateSecondaryActions>{cards}</EmptyStateSecondaryActions>
        <Button variant="primary" component={(props) => <Link {...props} to="/" />}>
          Take me home
        </Button>
      </EmptyState>
    </>
  );
};

export default NotFound;
