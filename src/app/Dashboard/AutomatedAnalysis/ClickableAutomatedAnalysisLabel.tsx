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

import { AutomatedAnalysisScore, AnalysisResult } from '@app/Shared/Services/api.types';
import { portalRoot } from '@app/utils/utils';
import { Label, LabelProps, Popover } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, InfoCircleIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import popoverStyles from '@patternfly/react-styles/css/components/Popover/popover';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { transformAADescription } from './utils';

export interface ClickableAutomatedAnalysisLabelProps {
  result: AnalysisResult;
}

export const clickableAutomatedAnalysisKey = 'clickable-automated-analysis-label';

export const ClickableAutomatedAnalysisLabel: React.FC<ClickableAutomatedAnalysisLabelProps> = ({ result }) => {
  const { t } = useTranslation();

  const [isHoveredOrFocused, setIsHoveredOrFocused] = React.useState(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = React.useState(false);

  const handleHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(true), [setIsHoveredOrFocused]);
  const handleNonHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(false), [setIsHoveredOrFocused]);

  const alertStyle = {
    custom: popoverStyles.modifiers.custom,
    info: popoverStyles.modifiers.info,
    success: popoverStyles.modifiers.success,
    warning: popoverStyles.modifiers.warning,
    danger: popoverStyles.modifiers.danger,
  };

  const colorScheme = React.useMemo((): LabelProps['color'] => {
    // TODO: use label color schemes based on settings for accessibility
    // context.settings.etc.
    return result.score == AutomatedAnalysisScore.NA_SCORE
      ? 'grey'
      : result.score < AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD
        ? 'green'
        : result.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD
          ? 'orange'
          : 'red';
  }, [result.score]);

  const alertPopoverVariant = React.useMemo(() => {
    return result.score == AutomatedAnalysisScore.NA_SCORE
      ? 'custom'
      : result.score < AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD
        ? 'success'
        : result.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD
          ? 'warning'
          : 'danger';
  }, [result.score]);

  const icon = React.useMemo(() => {
    return result.score == AutomatedAnalysisScore.NA_SCORE ? (
      <InfoCircleIcon />
    ) : result.score < AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD ? (
      <CheckCircleIcon />
    ) : result.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD ? (
      <WarningTriangleIcon />
    ) : (
      <ExclamationCircleIcon />
    );
  }, [result.score]);

  return (
    <Popover
      aria-label={t('ClickableAutomatedAnalysisLabel.ARIA_LABELS.POPOVER')}
      isVisible={isDescriptionVisible}
      headerContent={<div className={`${clickableAutomatedAnalysisKey}-popover-header`}>{result.name}</div>}
      alertSeverityVariant={alertPopoverVariant}
      alertSeverityScreenReaderText={alertPopoverVariant}
      shouldOpen={() => setIsDescriptionVisible(true)}
      shouldClose={() => setIsDescriptionVisible(false)}
      key={`${clickableAutomatedAnalysisKey}-popover-${result.name}`}
      bodyContent={
        <div
          className={`${clickableAutomatedAnalysisKey}-popover-body`}
          key={`${clickableAutomatedAnalysisKey}-popover-body-${result.name}`}
        >
          <p className={css(alertStyle[alertPopoverVariant], `${clickableAutomatedAnalysisKey}-popover-body-score`)}>
            {result.score == AutomatedAnalysisScore.NA_SCORE ? 'N/A' : result.score.toFixed(1)}
          </p>
          {transformAADescription(result)}
        </div>
      }
      appendTo={portalRoot}
      className={`${clickableAutomatedAnalysisKey}-popover`}
    >
      <Label
        aria-label={result.name}
        icon={icon}
        color={colorScheme}
        className={isHoveredOrFocused ? `clickable-label-hovered` : ''}
        onMouseEnter={handleHoveredOrFocused}
        onMouseLeave={handleNonHoveredOrFocused}
        onFocus={handleHoveredOrFocused}
        key={`${clickableAutomatedAnalysisKey}-${result.name}`}
        isCompact
      >
        <span className={`${clickableAutomatedAnalysisKey}-name`}>{`${result.name}`}</span>
        {
          // don't use isTruncated here, it doesn't work with the popover because of helperText
        }
      </Label>
    </Popover>
  );
};
