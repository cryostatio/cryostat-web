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
    [setSortBy, sortBy]
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
            {flatFiltered.map((evaluation) => {
              const [summary, explanation] = evaluation.description.split('Explanation:');
              return (
                <Tr key={evaluation.name}>
                  <Td dataLabel={t('NAME', { ns: 'common' })} width={10}>
                    {evaluation.name}
                  </Td>
                  <Td dataLabel={t('SCORE', { ns: 'common' })} modifier="wrap">
                    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        {evaluation.score == AutomatedAnalysisScore.NA_SCORE
                          ? t('N/A', { ns: 'common' })
                          : evaluation.score.toFixed(1)}
                      </FlexItem>
                      <FlexItem>{icon(evaluation.score)}</FlexItem>
                    </Flex>
                  </Td>
                  <Td modifier="breakWord" dataLabel={t('DESCRIPTION', { ns: 'common' })}>
                    <p>
                      <strong>Summary:</strong> {summary.replace('Summary:', '')}
                    </p>
                    {explanation && (
                      <p
                        style={{
                          paddingTop: '0.5rem',
                        }}
                      >
                        <strong>Explanation:</strong> {explanation}
                      </p>
                    )}
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
