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
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Split,
  SplitItem,
  Text,
  TextContent,
} from '@patternfly/react-core';
import * as React from 'react';
import { TooltipRenderProps } from 'react-joyride';

const JoyrideTooltip: React.FC<TooltipRenderProps> = ({
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  index,
  isLastStep,
  step,
  size,
}) => {
  const { title, content } = step;

  const isFirstStep = React.useMemo(() => {
    return index == 0;
  }, [index]);

  const footer = React.useMemo(() => {
    return (
      <Split hasGutter style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
        {!isFirstStep && !isLastStep && (
          <SplitItem isFilled>
            <TextContent>
              <Text component="small">
                {
                  `Step ${index - 1}/${size - 3}` // Index starts at 0, tour starts at 2, there are 3 steps that don't need a footer
                }
              </Text>
            </TextContent>
          </SplitItem>
        )}
        <SplitItem>
          <ActionList>
            <ActionListGroup>
              <ActionListItem>
                {isFirstStep ? (
                  <Button {...skipProps} variant="secondary">
                    Skip tour
                  </Button>
                ) : (
                  <Button {...backProps} variant="secondary">
                    Back
                  </Button>
                )}
              </ActionListItem>
              <ActionListItem>
                {
                  <Button {...primaryProps}>
                    {isLastStep ? 'Okay, got it!' : isFirstStep ? 'Get Started' : 'Next'}
                  </Button>
                }
              </ActionListItem>
            </ActionListGroup>
          </ActionList>
        </SplitItem>
      </Split>
    );
  }, [isFirstStep, isLastStep, backProps, primaryProps, skipProps, index, size]);

  return (
    <div
      className="joyride-tooltip"
      {...tooltipProps}
      style={{ maxWidth: isFirstStep || isLastStep ? '50vh' : '34vh' }}
    >
      <Card>
        <CardTitle style={{ textAlign: 'center' }}>{title}</CardTitle>
        <CardBody style={{ fontSize: '1em' }}>{content}</CardBody>
        {index !== 1 && <CardFooter>{footer}</CardFooter>}
      </Card>
    </div>
  );
};

export default JoyrideTooltip;
