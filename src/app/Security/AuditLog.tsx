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
import { AuditRevisionsTable } from '@app/Security/AuditRevisionsTable';
import { AuditQueryParams, AuditRevision, AuditRevisionsResponse } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Button,
  Card,
  CardBody,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Pagination,
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { DownloadIcon, RedoIcon, SearchIcon } from '@patternfly/react-icons';
import dayjs from 'dayjs';
import * as React from 'react';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export const AuditLog: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const getDefaultStartTime = React.useCallback(() => dayjs().subtract(1, 'hour').format('YYYY-MM-DDTHH:mm'), []);
  const getDefaultEndTime = React.useCallback(() => dayjs().add(1, 'minute').format('YYYY-MM-DDTHH:mm'), []);

  const [startTime, setStartTime] = React.useState<string>(getDefaultStartTime());
  const [endTime, setEndTime] = React.useState<string>(getDefaultEndTime());
  const [validationError, setValidationError] = React.useState('');

  const [queryParams, setQueryParams] = React.useState<AuditQueryParams | null>(null);
  const [revisions, setRevisions] = React.useState<AuditRevision[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const handleQuerySubmit = React.useCallback(
    (params: AuditQueryParams) => {
      setQueryParams(params);
      setIsLoading(true);
      setErrorMessage('');
      setRevisions([]);
      setTotalCount(0);

      addSubscription(
        context.api
          .getAuditRevisions(params)
          .pipe(
            tap((response: AuditRevisionsResponse) => {
              setRevisions(response.revisions);
              setTotalCount(response.totalCount);
              setIsLoading(false);
            }),
            catchError((err) => {
              setErrorMessage(err.message || t('AuditLog.TABLE.FAILED_TO_FETCH'));
              setIsLoading(false);
              return of(null);
            }),
          )
          .subscribe(),
      );
    },
    [context.api, addSubscription, t],
  );

  const handleQuery = React.useCallback(() => {
    const startDate = dayjs(startTime);
    const endDate = dayjs(endTime);

    if (!startDate.isValid() || !endDate.isValid()) {
      setValidationError(t('AuditLog.QUERY_FORM.VALIDATION.INVALID_DATE_FORMAT'));
      return;
    }

    if (endDate.isBefore(startDate) || endDate.isSame(startDate)) {
      setValidationError(t('AuditLog.QUERY_FORM.VALIDATION.END_BEFORE_START'));
      return;
    }

    setValidationError('');
    handleQuerySubmit({
      startTime: startDate.valueOf(),
      endTime: endDate.valueOf(),
      page: 0,
      pageSize: 20,
    });
  }, [startTime, endTime, handleQuerySubmit, t]);

  const handleDownload = React.useCallback(() => {
    if (queryParams) {
      context.api.exportAuditLog(queryParams.startTime, queryParams.endTime);
    }
  }, [queryParams, context.api]);

  const handleReset = React.useCallback(() => {
    setStartTime(getDefaultStartTime());
    setEndTime(getDefaultEndTime());
    setValidationError('');
    setQueryParams(null);
    setRevisions([]);
    setTotalCount(0);
    setErrorMessage('');
  }, [getDefaultStartTime, getDefaultEndTime]);

  const handlePageChange = React.useCallback(
    (page: number, pageSize: number) => {
      if (queryParams) {
        handleQuerySubmit({
          ...queryParams,
          page: page - 1,
          pageSize,
        });
      }
    },
    [queryParams, handleQuerySubmit],
  );

  const toolbar = (
    <Toolbar id="audit-log-toolbar">
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>{t('AuditLog.QUERY_FORM.START_TIME')}:</span>
              <TextInput
                type="datetime-local"
                value={startTime}
                onChange={(_event, value) => setStartTime(value)}
                isDisabled={isLoading}
                aria-label={t('AuditLog.QUERY_FORM.START_TIME')}
              />
            </div>
          </ToolbarItem>
          <ToolbarItem style={{ marginLeft: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>{t('AuditLog.QUERY_FORM.END_TIME')}:</span>
              <TextInput
                type="datetime-local"
                value={endTime}
                onChange={(_event, value) => setEndTime(value)}
                isDisabled={isLoading}
                aria-label={t('AuditLog.QUERY_FORM.END_TIME')}
                validated={validationError ? 'error' : 'default'}
              />
            </div>
          </ToolbarItem>
          <ToolbarItem style={{ marginLeft: '16px' }}>
            <Tooltip content={t('AuditLog.QUERY_FORM.RESET')}>
              <Button
                variant="secondary"
                onClick={handleReset}
                isDisabled={isLoading}
                icon={<RedoIcon />}
                aria-label={t('AuditLog.QUERY_FORM.RESET')}
              />
            </Tooltip>
          </ToolbarItem>
        </ToolbarGroup>
        <ToolbarItem variant="separator" />
        <ToolbarGroup variant="action-group">
          <ToolbarItem>
            <Tooltip content={t('AuditLog.QUERY_FORM.EXECUTE')}>
              <Button
                variant="primary"
                onClick={handleQuery}
                isLoading={isLoading}
                isDisabled={isLoading || !!validationError}
                icon={<SearchIcon />}
                aria-label={t('AuditLog.QUERY_FORM.EXECUTE')}
              />
            </Tooltip>
          </ToolbarItem>
          <ToolbarItem>
            <Tooltip content={t('AuditLog.QUERY_FORM.DOWNLOAD')}>
              <Button
                variant="secondary"
                onClick={handleDownload}
                isDisabled={!queryParams || revisions.length === 0}
                icon={<DownloadIcon />}
                aria-label={t('AuditLog.QUERY_FORM.DOWNLOAD')}
              />
            </Tooltip>
          </ToolbarItem>
        </ToolbarGroup>
        {queryParams && totalCount > 0 && (
          <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
            <Pagination
              itemCount={totalCount}
              perPage={queryParams.pageSize || 20}
              page={(queryParams.page || 0) + 1}
              onSetPage={(_event, page) => handlePageChange(page, queryParams.pageSize || 20)}
              onPerPageSelect={(_event, perPage) => handlePageChange(1, perPage)}
              variant="top"
              isCompact
            />
          </ToolbarItem>
        )}
      </ToolbarContent>
      {validationError && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error">{validationError}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </Toolbar>
  );

  return (
    <BreadcrumbPage pageTitle={t('AuditLog.TITLE')}>
      <Card>
        <CardBody>
          {toolbar}
          <AuditRevisionsTable
            revisions={revisions}
            isLoading={isLoading}
            errorMessage={errorMessage}
            queryParams={queryParams}
          />
        </CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export default AuditLog;
