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
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
} from '@patternfly/react-core';
import React from 'react';
import { TooltipRenderProps } from 'react-joyride';

const CustomTooltip: React.FC<TooltipRenderProps> = ({
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  index,
  isLastStep,
  step,
}) => {
  const { title, content } = step;

  const isFirstStep = React.useMemo(() => {
    return index == 0;
  }, [index]);

  const actionList = React.useMemo(() => {
    return (
      <ActionList style={{ justifyContent: 'flex-end' }}>
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
            {<Button {...primaryProps}>{isLastStep ? 'Okay, got it!' : isFirstStep ? 'Get Started' : 'Next'}</Button>}
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    );
  }, [isFirstStep, isLastStep, backProps, primaryProps, skipProps]);

  return (
    <div
      className="joyride-tooltip"
      {...tooltipProps}
      style={{ maxWidth: isFirstStep || isLastStep ? '50vh' : '34vh' }}
    >
      <Card>
        <CardTitle style={{ textAlign: 'center' }}>{title}</CardTitle>
        <CardBody style={{ fontSize: '15px' }}>{content}</CardBody>
        {index !== 1 && <CardFooter>{actionList}</CardFooter>}
      </Card>
    </div>
  );
};

export default CustomTooltip;
