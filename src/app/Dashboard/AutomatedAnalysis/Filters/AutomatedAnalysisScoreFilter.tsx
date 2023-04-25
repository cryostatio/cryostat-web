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

import { automatedAnalysisAddGlobalFilterIntent, RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { AutomatedAnalysisScore } from '@app/Shared/Services/Report.service';
import { portalRoot } from '@app/utils/utils';
import {
  Button,
  Level,
  LevelItem,
  Slider,
  SliderStepObject,
  Text,
  TextVariants,
  Tooltip,
} from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

export interface AutomatedAnalysisScoreFilterProps {}

export const AutomatedAnalysisScoreFilter: React.FC<AutomatedAnalysisScoreFilterProps> = (_) => {
  const dispatch = useDispatch<StateDispatch>();
  const { t } = useTranslation();
  const currentScore = useSelector((state: RootState) => {
    const filters = state.automatedAnalysisFilters.state.globalFilters.filters;
    if (!filters) return 0;
    return filters.Score;
  });

  const steps = [
    { value: 0, label: '0' },
    { value: 12.5, label: t('OK', { ns: 'common' }) }, // some hacks that work with css to get bolded and coloured labels above slider
    {
      value: AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD,
      label: String(AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD),
    },
    { value: 50, label: t('WARNING', { ns: 'common' }) },
    { value: AutomatedAnalysisScore.RED_SCORE_THRESHOLD, label: String(AutomatedAnalysisScore.RED_SCORE_THRESHOLD) },
    { value: 87.5, label: t('CRITICAL', { ns: 'common' }) },
    { value: 100, label: '100' },
  ] as SliderStepObject[];

  const on100Reset = React.useCallback(() => {
    dispatch(automatedAnalysisAddGlobalFilterIntent('Score', 100));
  }, [dispatch]);

  const on0Reset = React.useCallback(() => {
    dispatch(automatedAnalysisAddGlobalFilterIntent('Score', 0));
  }, [dispatch]);

  const onChange = React.useCallback(
    (value: number, inputValue: number | undefined) => {
      value = Math.round(value * 10) / 10;
      let newValue;
      if (inputValue === undefined) {
        newValue = value;
      } else {
        if (inputValue > 100) {
          newValue = 100;
        } else if (inputValue < 0) {
          newValue = 0;
        } else {
          newValue = Math.round(inputValue * 10) / 10;
        }
      }
      dispatch(automatedAnalysisAddGlobalFilterIntent('Score', newValue));
    },
    [dispatch]
  );

  const className = React.useMemo(() => {
    if (currentScore >= AutomatedAnalysisScore.RED_SCORE_THRESHOLD) {
      return 'automated-analysis-score-filter-slider automated-analysis-score-filter-slider-critical';
    } else if (currentScore >= AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD) {
      return 'automated-analysis-score-filter-slider automated-analysis-score-filter-slider-warning';
    } else {
      return 'automated-analysis-score-filter-slider automated-analysis-score-filter-slider-ok';
    }
  }, [currentScore]);

  return (
    <>
      <Tooltip content={t('AutomatedAnalysisScoreFilter.TOOLTIP.CONTENT')} appendTo={portalRoot}>
        <Text component={TextVariants.small}>
          {t('AutomatedAnalysisScoreFilter.CURRENT_SCORE_TEXT', { val: currentScore })}
        </Text>
      </Tooltip>
      <Slider
        leftActions={
          <Level hasGutter>
            <LevelItem>
              <Text component={TextVariants.small}>{t('RESET', { ns: 'common' })}:</Text>
            </LevelItem>
            <LevelItem>
              <Button
                isSmall
                isInline
                variant="link"
                aria-label={t('AutomatedAnalysisScoreFilter.SLIDER.RESET0.LABEL')}
                onClick={on0Reset}
              >
                0
              </Button>
            </LevelItem>
            <LevelItem>
              <Button
                isSmall
                isInline
                variant="link"
                aria-label={t('AutomatedAnalysisScoreFilter.SLIDER.RESET100.LABEL')}
                onClick={on100Reset}
              >
                100
              </Button>
            </LevelItem>
          </Level>
        }
        step={0.1}
        className={className}
        areCustomStepsContinuous
        customSteps={steps}
        isInputVisible
        inputLabel={t('SCORE', { ns: 'common' })}
        inputValue={currentScore}
        value={currentScore}
        onChange={onChange}
        min={0}
        max={100}
      />
    </>
  );
};
