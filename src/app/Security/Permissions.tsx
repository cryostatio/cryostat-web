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

import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { Permission } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Panel,
  PanelMain,
  PanelMainBody,
  Spinner,
} from '@patternfly/react-core';
import * as React from 'react';
import { map, tap } from 'rxjs/operators';
import { PermissionsTable } from './PermissionsTable';

export const Permissions: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [loading, setLoading] = React.useState(true);
  const [permissions, setPermissions] = React.useState<Permission[]>([]);

  React.useEffect(() => {
    setLoading(true);
    addSubscription(
      context.api
        .getPermissions()
        .pipe(
          tap((_) => setLoading(false)),
          map((a: Permission[]) => a.sort()),
        )
        .subscribe(setPermissions),
    );
  }, [setLoading, addSubscription, context.api, setPermissions]);

  return (
    <BreadcrumbPage pageTitle="User Permissions">
      <Card>
        <CardTitle>
          <Content component="p">{t('Permissions.CARD_TITLE')}</Content>
          <Content>
            <Content component={ContentVariants.small}>{t('Permissions.CARD_DESCRIPTION')}</Content>
          </Content>
        </CardTitle>
        <CardBody isFilled>
          <Panel isScrollable>
            <PanelMain>
              <PanelMainBody>
                {loading ? (
                  <Spinner />
                ) : permissions.length ? (
                  <PermissionsTable permissions={permissions} />
                ) : (
                  <EmptyState
                    variant={EmptyStateVariant.xs}
                    headingLevel="h4"
                    titleText={t('Permissions.NO_CONTENT_TITLE')}
                  >
                    <EmptyStateBody>{t('Permissions.NO_CONTENT_BODY')}</EmptyStateBody>
                  </EmptyState>
                )}
              </PanelMainBody>
            </PanelMain>
          </Panel>
        </CardBody>
      </Card>
    </BreadcrumbPage>
  );
};
