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
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
  Gallery,
  GalleryItem,
} from '@patternfly/react-core';
import { MapMarkedAltIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { NotFoundCard } from './NotFoundCard';

export interface NotFoundProps {}

export const NotFound: React.FC<NotFoundProps> = (_) => {
  const { t } = useTranslation();
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
      <EmptyState>
        <EmptyStateHeader
          titleText={t('NotFound.TITLE')}
          icon={<EmptyStateIcon icon={MapMarkedAltIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>{t('NotFound.DESCRIPTION')}</EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" component={(props) => <Link {...props} to="/" />}>
              {t('NotFound.HOME_REDIRECT_BUTTON_CONTENT')}
            </Button>
          </EmptyStateActions>
          <EmptyStateActions>
            <Gallery hasGutter style={{ marginTop: '1rem' }}>
              {cards.map((card, idx) => (
                <GalleryItem key={idx}>{card}</GalleryItem>
              ))}
            </Gallery>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </>
  );
};

export default NotFound;
