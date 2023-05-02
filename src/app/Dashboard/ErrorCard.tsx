/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
