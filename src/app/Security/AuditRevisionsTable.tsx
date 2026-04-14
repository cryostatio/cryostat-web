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

import { ErrorView } from '@app/ErrorView/ErrorView';
import { AuditRevisionDetailView } from '@app/Security/AuditRevisionDetailView';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { AuditQueryParams, AuditRevision, AuditRevisionDetail } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td, ExpandableRowContent } from '@patternfly/react-table';
import * as React from 'react';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface AuditRevisionsTableProps {
  revisions: AuditRevision[];
  isLoading: boolean;
  errorMessage: string;
  queryParams: AuditQueryParams | null;
}

export const AuditRevisionsTable: React.FC<AuditRevisionsTableProps> = ({
  revisions,
  isLoading,
  errorMessage,
  queryParams,
}) => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [dayjs, datetimeContext] = useDayjs();

  const [expandedRevisions, setExpandedRevisions] = React.useState<Set<number>>(new Set());
  const [revisionDetails, setRevisionDetails] = React.useState<Map<number, AuditRevisionDetail>>(new Map());
  const [loadingDetails, setLoadingDetails] = React.useState<Set<number>>(new Set());

  const handleExpand = React.useCallback(
    (rev: number) => {
      const newExpanded = new Set(expandedRevisions);
      if (newExpanded.has(rev)) {
        newExpanded.delete(rev);
      } else {
        newExpanded.add(rev);

        if (!revisionDetails.has(rev)) {
          setLoadingDetails((prev) => new Set(prev).add(rev));

          addSubscription(
            context.api
              .getAuditRevisionDetail(rev)
              .pipe(
                tap((detail: AuditRevisionDetail) => {
                  setRevisionDetails((prev) => new Map(prev).set(rev, detail));
                  setLoadingDetails((prev) => {
                    const next = new Set(prev);
                    next.delete(rev);
                    return next;
                  });
                }),
                catchError((_err) => {
                  setLoadingDetails((prev) => {
                    const next = new Set(prev);
                    next.delete(rev);
                    return next;
                  });
                  return of(null);
                }),
              )
              .subscribe(),
          );
        }
      }
      setExpandedRevisions(newExpanded);
    },
    [expandedRevisions, revisionDetails, context.api, addSubscription],
  );

  if (errorMessage) {
    return <ErrorView title={t('AuditLog.TABLE.ERROR_TITLE')} message={errorMessage} />;
  }

  if (isLoading) {
    return <LoadingView />;
  }

  if (!queryParams) {
    return (
      <EmptyState>
        <EmptyStateHeader
          titleText={t('AuditLog.TABLE.NO_QUERY')}
          icon={<EmptyStateIcon icon={SearchIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>{t('AuditLog.TABLE.NO_QUERY_DESCRIPTION')}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (revisions.length === 0) {
    return (
      <EmptyState>
        <EmptyStateHeader
          titleText={t('AuditLog.TABLE.EMPTY_STATE')}
          icon={<EmptyStateIcon icon={SearchIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>{t('AuditLog.TABLE.EMPTY_STATE_DESCRIPTION')}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label={t('AuditLog.TABLE.ARIA_LABEL')} variant="compact">
      <Thead>
        <Tr>
          <Th />
          <Th>{t('AuditLog.TABLE.REVISION')}</Th>
          <Th>{t('AuditLog.TABLE.TIMESTAMP')}</Th>
          <Th>{t('AuditLog.TABLE.USERNAME')}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {revisions.map((revision, rowIndex) => {
          const isExpanded = expandedRevisions.has(revision.rev);
          const detail = revisionDetails.get(revision.rev);
          const isLoadingDetail = loadingDetails.has(revision.rev);

          return (
            <React.Fragment key={revision.rev}>
              <Tr>
                <Td
                  expand={{
                    rowIndex,
                    isExpanded,
                    onToggle: () => handleExpand(revision.rev),
                  }}
                />
                <Td dataLabel={t('AuditLog.TABLE.REVISION')}>{revision.rev}</Td>
                <Td dataLabel={t('AuditLog.TABLE.TIMESTAMP')}>
                  <Timestamp
                    tooltip={{
                      variant: TimestampTooltipVariant.custom,
                      content: dayjs(revision.revtstmp).toISOString(),
                    }}
                  >
                    {dayjs(revision.revtstmp).tz(datetimeContext.timeZone.full).format('L LTS z')}
                  </Timestamp>
                </Td>
                <Td dataLabel={t('AuditLog.TABLE.USERNAME')}>
                  {revision.username || t('AuditLog.TABLE.UNKNOWN_USER')}
                </Td>
              </Tr>
              {isExpanded && (
                <Tr isExpanded={true}>
                  <Td colSpan={4}>
                    <ExpandableRowContent>
                      {isLoadingDetail ? (
                        <LoadingView />
                      ) : detail ? (
                        <AuditRevisionDetailView detail={detail} />
                      ) : (
                        <div>{t('AuditLog.TABLE.FAILED_TO_LOAD_DETAILS')}</div>
                      )}
                    </ExpandableRowContent>
                  </Td>
                </Tr>
              )}
            </React.Fragment>
          );
        })}
      </Tbody>
    </Table>
  );
};
