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

import { AutomatedAnalysisScore, RuleEvaluation } from '@app/Shared/Services/Report.service';
import { portalRoot } from '@app/utils/utils';
import { Label, LabelProps, Popover } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, InfoCircleIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import popoverStyles from '@patternfly/react-styles/css/components/Popover/popover';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { transformAADescription } from '../dashboard-utils';

export interface ClickableAutomatedAnalysisLabelProps {
  label: RuleEvaluation;
}

export const clickableAutomatedAnalysisKey = 'clickable-automated-analysis-label';

export const ClickableAutomatedAnalysisLabel: React.FC<ClickableAutomatedAnalysisLabelProps> = ({ label }) => {
  const { t } = useTranslation();

  const [isHoveredOrFocused, setIsHoveredOrFocused] = React.useState(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = React.useState(false);

  const handleHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(true), [setIsHoveredOrFocused]);
  const handleNonHoveredOrFocused = React.useCallback(() => setIsHoveredOrFocused(false), [setIsHoveredOrFocused]);

  const alertStyle = {
    default: popoverStyles.modifiers.default,
    info: popoverStyles.modifiers.info,
    success: popoverStyles.modifiers.success,
    warning: popoverStyles.modifiers.warning,
    danger: popoverStyles.modifiers.danger,
  };

  const colorScheme = React.useMemo((): LabelProps['color'] => {
    // TODO: use label color schemes based on settings for accessibility
    // context.settings.etc.
    return label.score == AutomatedAnalysisScore.NA_SCORE
      ? 'grey'
      : label.score < AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD
      ? 'green'
      : label.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD
      ? 'orange'
      : 'red';
  }, [label.score]);

  const alertPopoverVariant = React.useMemo(() => {
    return label.score == AutomatedAnalysisScore.NA_SCORE
      ? 'default'
      : label.score < AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD
      ? 'success'
      : label.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD
      ? 'warning'
      : 'danger';
  }, [label.score]);

  const icon = React.useMemo(() => {
    return label.score == AutomatedAnalysisScore.NA_SCORE ? (
      <InfoCircleIcon />
    ) : label.score < AutomatedAnalysisScore.ORANGE_SCORE_THRESHOLD ? (
      <CheckCircleIcon />
    ) : label.score < AutomatedAnalysisScore.RED_SCORE_THRESHOLD ? (
      <WarningTriangleIcon />
    ) : (
      <ExclamationCircleIcon />
    );
  }, [label.score]);

  return (
    <Popover
      aria-label={t('ClickableAutomatedAnalysisLabel.ARIA_LABELS.POPOVER')}
      isVisible={isDescriptionVisible}
      headerContent={<div className={`${clickableAutomatedAnalysisKey}-popover-header`}>{label.name}</div>}
      alertSeverityVariant={alertPopoverVariant}
      alertSeverityScreenReaderText={alertPopoverVariant}
      shouldOpen={() => setIsDescriptionVisible(true)}
      shouldClose={() => setIsDescriptionVisible(false)}
      key={`${clickableAutomatedAnalysisKey}-popover-${label.name}`}
      bodyContent={
        <div
          className={`${clickableAutomatedAnalysisKey}-popover-body`}
          key={`${clickableAutomatedAnalysisKey}-popover-body-${label.name}`}
        >
          <p className={css(alertStyle[alertPopoverVariant], `${clickableAutomatedAnalysisKey}-popover-body-score`)}>
            {label.score == AutomatedAnalysisScore.NA_SCORE ? 'N/A' : label.score.toFixed(1)}
          </p>
          {transformAADescription(label.description)}
        </div>
      }
      appendTo={portalRoot}
    >
      <Label
        aria-label={label.name}
        icon={icon}
        color={colorScheme}
        className={isHoveredOrFocused ? `clickable-label-hovered` : ''}
        onMouseEnter={handleHoveredOrFocused}
        onMouseLeave={handleNonHoveredOrFocused}
        onFocus={handleHoveredOrFocused}
        key={`${clickableAutomatedAnalysisKey}-${label.name}`}
        isCompact
      >
        <span className={`${clickableAutomatedAnalysisKey}-name`}>{`${label.name}`}</span>
        {
          // don't use isTruncated here, it doesn't work with the popover because of helperText
        }
      </Label>
    </Popover>
  );
};
