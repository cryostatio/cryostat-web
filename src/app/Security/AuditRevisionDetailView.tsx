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

import { TruncatedText } from '@app/Shared/Components/TruncatedText';
import {
  AuditRevisionDetail,
  AuditEntity,
  getRevisionTypeName,
  KeyValue,
  keyValueToString,
} from '@app/Shared/Services/api.types';
import { useDayjs } from '@app/utils/hooks/useDayjs';
import { formatDuration, LABEL_TEXT_MAXWIDTH } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Label, LabelGroup, Timestamp, TimestampTooltipVariant, Title } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import * as React from 'react';

export interface AuditRevisionDetailViewProps {
  detail: AuditRevisionDetail;
}

export const AuditRevisionDetailView: React.FC<AuditRevisionDetailViewProps> = ({ detail }) => {
  const { t } = useCryostatTranslation();
  const [dayjs, datetimeContext] = useDayjs();

  const renderCellValue = React.useCallback(
    (field: string, value: unknown): React.ReactNode => {
      if (value === undefined || value === null) {
        return '-';
      }

      // Handle duration fields (in milliseconds)
      if (field === 'duration' && typeof value === 'number') {
        if (value === 0) {
          return t('CONTINUOUS');
        }
        return formatDuration(value);
      }

      // Handle startTime fields (timestamps in milliseconds)
      if (field === 'startTime' && typeof value === 'number') {
        return (
          <Timestamp
            tooltip={{
              variant: TimestampTooltipVariant.custom,
              content: dayjs(value).toISOString(),
            }}
          >
            {dayjs(value).tz(datetimeContext.timeZone.full).format('L LTS z')}
          </Timestamp>
        );
      }

      // Handle labels field (simple KeyValue array)
      if (field === 'labels' && Array.isArray(value)) {
        if (value.length === 0) {
          return '-';
        }
        return (
          <LabelGroup>
            {value.map((label: KeyValue) => (
              <Label key={label.key} color="blue" textMaxWidth={LABEL_TEXT_MAXWIDTH}>
                {keyValueToString(label)}
              </Label>
            ))}
          </LabelGroup>
        );
      }

      // Handle annotations field (object with cryostat and platform arrays)
      if (field === 'annotations' && typeof value === 'object' && value !== null) {
        const annotations = value as { cryostat?: KeyValue[]; platform?: KeyValue[] };
        const hasCryostat = annotations.cryostat && annotations.cryostat.length > 0;
        const hasPlatform = annotations.platform && annotations.platform.length > 0;

        if (!hasCryostat && !hasPlatform) {
          return '-';
        }

        return (
          <div>
            {hasCryostat && (
              <div style={{ marginBottom: hasPlatform ? '8px' : '0' }}>
                <LabelGroup categoryName="cryostat">
                  {annotations.cryostat!.map((annotation: KeyValue) => (
                    <Label key={annotation.key} color="blue" textMaxWidth={LABEL_TEXT_MAXWIDTH}>
                      {keyValueToString(annotation)}
                    </Label>
                  ))}
                </LabelGroup>
              </div>
            )}
            {hasPlatform && (
              <div>
                <LabelGroup categoryName="platform">
                  {annotations.platform!.map((annotation: KeyValue) => (
                    <Label key={annotation.key} color="blue" textMaxWidth={LABEL_TEXT_MAXWIDTH}>
                      {keyValueToString(annotation)}
                    </Label>
                  ))}
                </LabelGroup>
              </div>
            )}
          </div>
        );
      }

      // Handle metadata labels (for backward compatibility)
      if (field === 'metadata' && typeof value === 'object') {
        const metadata = value as { labels?: KeyValue[] };
        if (metadata.labels && Array.isArray(metadata.labels)) {
          if (metadata.labels.length === 0) {
            return '-';
          }
          return (
            <LabelGroup>
              {metadata.labels.map((label: KeyValue) => (
                <Label key={label.key} color="grey" textMaxWidth={LABEL_TEXT_MAXWIDTH}>
                  {keyValueToString(label)}
                </Label>
              ))}
            </LabelGroup>
          );
        }
      }

      // Handle other object types
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    },
    [t, datetimeContext.timeZone.full, dayjs],
  );

  const renderEntityTable = (entityType: string, entities: AuditEntity[]) => {
    if (entities.length === 0) return null;

    const fieldNames = new Set<string>();
    entities.forEach((entity) => {
      Object.keys(entity).forEach((key) => {
        if (!['id', 'rev', 'revtype', 'revend', 'revend_tstmp'].includes(key)) {
          fieldNames.add(key);
        }
      });
    });

    return (
      <div key={entityType} style={{ marginBottom: '16px' }}>
        <Title headingLevel="h4" size="md" style={{ marginBottom: '8px' }}>
          {entityType} ({entities.length})
        </Title>
        <Table aria-label={`${entityType} changes`} variant="compact">
          <Thead>
            <Tr>
              <Th>{t('AuditLog.DETAIL.ENTITY_ID')}</Th>
              <Th>{t('AuditLog.DETAIL.OPERATION')}</Th>
              {Array.from(fieldNames).map((field) => (
                <Th key={field}>{field}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {entities.map((entity, idx) => (
              <Tr key={idx}>
                <Td>{entity.id}</Td>
                <Td>{getRevisionTypeName(entity.revtype)}</Td>
                {Array.from(fieldNames).map((field) => {
                  const value = entity[field];
                  const displayValue = renderCellValue(field, value);

                  return (
                    <Td key={field} style={{ maxWidth: '300px', wordBreak: 'break-word' }}>
                      {displayValue === '-' || React.isValidElement(displayValue) ? (
                        displayValue
                      ) : (
                        <TruncatedText text={String(displayValue)} maxLength={30} />
                      )}
                    </Td>
                  );
                })}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    );
  };

  return (
    <div>
      {Object.entries(detail.entities).map(([entityType, entities]) => renderEntityTable(entityType, entities))}
    </div>
  );
};
