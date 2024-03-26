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

import { automatedAnalysisAddGlobalFilterIntent, RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { AutomatedAnalysisScore } from '@app/Shared/Services/api.types';
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
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

export interface AutomatedAnalysisScoreFilterProps {}

export const AutomatedAnalysisScoreFilter: React.FC<AutomatedAnalysisScoreFilterProps> = (_) => {
  const dispatch = useDispatch<StateDispatch>();
  const { t } = useTranslation();
  const currentScore = useSelector((state: RootState) => {
    const filters = state.automatedAnalysisFilters.globalFilters.filters;
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
    (_, value: number, inputValue: number | undefined) => {
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
    [dispatch],
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
        startActions={
          <Level hasGutter>
            <LevelItem>
              <Text component={TextVariants.small}>{t('RESET', { ns: 'common' })}:</Text>
            </LevelItem>
            <LevelItem>
              <Button
                size="sm"
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
                size="sm"
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
