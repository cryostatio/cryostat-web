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
import { ErrorView } from '@app/ErrorView/ErrorView';
import { Mapping } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Card, CardBody, CardTitle, Content, ContentVariants, Spinner } from '@patternfly/react-core';
import * as React from 'react';
import { of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { PermissionsTable } from './PermissionsTable';

export const Permissions: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [loading, setLoading] = React.useState(true);
  const [permissions, setPermissions] = React.useState<Mapping[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    setLoading(true);
    addSubscription(
      context.api
        .getPermissions()
        .pipe(
          tap((_) => setLoading(false)),
          catchError((err) => {
            setErrorMessage(err.message);
            return of([]);
          }),
          map((a: Mapping[]) => a.sort()),
        )
        .subscribe(setPermissions),
    );
  }, [setLoading, addSubscription, context.api, setPermissions]);

  return errorMessage ? (
    <ErrorView title={t('Permissions.ERROR_TEXT')} message={errorMessage} />
  ) : (
    <BreadcrumbPage pageTitle="User Permissions">
      <Card>
        <CardTitle>
          <Content component="p">{t('Permissions.CARD_TITLE')}</Content>
          <Content>
            <Content component={ContentVariants.small}>{t('Permissions.CARD_DESCRIPTION')}</Content>
          </Content>
        </CardTitle>
        <CardBody isFilled>{loading ? <Spinner /> : <PermissionsTable permissions={permissions} />}</CardBody>
      </Card>
    </BreadcrumbPage>
  );
};
