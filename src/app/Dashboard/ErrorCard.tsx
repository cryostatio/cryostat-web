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
  Bullseye,
  CardBody,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStatePrimary,
  EmptyStateVariant,
  Title,
} from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CardConfig, CardValidationResult, DashboardCardSizes, DashboardCardTypeProps } from './dashboard-utils';
import { DashboardCard } from './DashboardCard';

export interface ErrorCardProps extends DashboardCardTypeProps {
  validationResult: CardValidationResult;
  cardConfig: CardConfig;
}

// TODO: Fix title + design body
export const ErrorCard: React.FC<ErrorCardProps> = ({
  validationResult,
  cardConfig: _cardConfig,
  dashboardId,
  actions,
  ...props
}) => {
  const { t } = useTranslation();
  const { errors, callForAction } = validationResult;

  const errorDescription = React.useMemo(() => {
    return (
      <DataList isCompact aria-label={'Card Configuration Errors'} className={'configuration-error-list'}>
        {errors.map((err, idx) => {
          return (
            <DataListItem key={`error-messageitem-${idx}`}>
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[<DataListCell key={`error-message-cell-${idx}`}>{err.message}</DataListCell>]}
                />
              </DataListItemRow>
            </DataListItem>
          );
        })}
      </DataList>
    );
  }, [errors]);

  return (
    <DashboardCard
      {...props}
      id={`${dashboardId}`}
      dashboardId={dashboardId}
      cardSizes={ErrorCardSizes}
      isCompact
      cardHeader={actions}
    >
      <CardBody>
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.full}>
            <EmptyStateIcon icon={WrenchIcon} />
            <Title headingLevel={'h4'}>{t('Dashboard.INVALID_CARD_CONFIGURATIONS')}</Title>
            <EmptyStateBody>{errorDescription}</EmptyStateBody>
            {callForAction ? <EmptyStatePrimary>{callForAction}</EmptyStatePrimary> : null}
          </EmptyState>
        </Bullseye>
      </CardBody>
    </DashboardCard>
  );
};

export const ErrorCardSizes: DashboardCardSizes = {
  span: {
    minimum: 2,
    default: 4,
    maximum: 12,
  },
  height: {
    // TODO: implement height resizing
    minimum: Number.NaN,
    default: Number.NaN,
    maximum: Number.NaN,
  },
};
