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

import { AutomatedAnalysisScore, CategorizedRuleEvaluations } from '@app/Shared/Services/Report.service';
import { Flex, FlexItem } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
} from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import {
  InnerScrollContainer,
  ISortBy,
  OuterScrollContainer,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { transformAADescription } from '../dashboard-utils';

export interface AutomatedAnalysisCardListProps {
  evaluations: CategorizedRuleEvaluations[];
}

export const AutomatedAnalysisCardList: React.FC<AutomatedAnalysisCardListProps> = (props) => {
  const { t } = useTranslation();

  const [sortBy, setSortBy] = React.useState<ISortBy>({});

  const icon = React.useCallback((score: number): JSX.Element => {
    return score == AutomatedAnalysisScore.NA_SCORE ? (
      <span className={css('pf-m-grey', 'pf-c-label__icon')}>
        <InfoCircleIcon />
      </span>
    ) : score < AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD ? (
      <span className={css('pf-m-green', 'pf-c-label__icon')}>
        <CheckCircleIcon />
      </span>
    ) : score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD ? (
      <span className={css('pf-m-orange', 'pf-c-label__icon')}>
        <ExclamationTriangleIcon />
      </span>
    ) : (
      <span className={css('pf-m-red', 'pf-c-label__icon')}>
        <ExclamationCircleIcon />
      </span>
    );
  }, []);

  const getSortParams = React.useCallback(
    (columnIndex: number): ThProps['sort'] => ({
      sortBy: sortBy,
      onSort: (_event, index, direction) => {
        setSortBy({ index, direction });
      },
      columnIndex,
    }),
    [setSortBy, sortBy],
  );

  const flatFiltered = React.useMemo(() => {
    return props.evaluations
      .flatMap(([_, evaluations]) => {
        return evaluations.map((evaluation) => evaluation);
      })
      .sort((a, b) => {
        const aValue = sortBy.index === 0 ? a.name : a.score;
        const bValue = sortBy.index === 0 ? b.name : b.score;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (sortBy.direction === 'asc') {
            return aValue.localeCompare(bValue);
          }
          return bValue.localeCompare(aValue);
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          if (sortBy.direction === 'asc') {
            if (aValue === bValue) {
              return a.name.localeCompare(b.name);
            }
            return aValue - bValue;
          } else {
            if (aValue === bValue) {
              return b.name.localeCompare(a.name);
            }
            return bValue - aValue;
          }
        }
        return 0;
      });
  }, [sortBy, props.evaluations]);

  return (
    <OuterScrollContainer className="automated-analysis-datalist-outerscroll">
      <InnerScrollContainer className="automated-analysis-datalist-innerscroll">
        <TableComposable aria-label={'Automated Analysis Data List'} gridBreakPoint={'grid-md'} isStickyHeader>
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)}>{t('NAME', { ns: 'common' })}</Th>
              <Th modifier="wrap" sort={getSortParams(1)}>
                {t('SCORE', { ns: 'common' })}
              </Th>
              <Th modifier="truncate">{t('DESCRIPTION', { ns: 'common' })}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {flatFiltered.map((result) => {
              return (
                <Tr key={result.name}>
                  <Td dataLabel={t('NAME', { ns: 'common' })} width={10}>
                    {result.name}
                  </Td>
                  <Td dataLabel={t('SCORE', { ns: 'common' })} modifier="wrap">
                    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        {result.score == AutomatedAnalysisScore.NA_SCORE
                          ? t('N/A', { ns: 'common' })
                          : result.score.toFixed(1)}
                      </FlexItem>
                      <FlexItem>{icon(result.score)}</FlexItem>
                    </Flex>
                  </Td>
                  <Td modifier="breakWord" dataLabel={t('DESCRIPTION', { ns: 'common' })}>
                    {transformAADescription(result)}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </TableComposable>
      </InnerScrollContainer>
    </OuterScrollContainer>
  );
};
