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
import { SerializedTarget } from '@app/Shared/SerializedTarget';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';
import {
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Label,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Text,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  HelpIcon,
  InfoCircleIcon,
  WarningTriangleIcon,
} from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';

export interface MatchExpressionEvaluatorProps {
  inlineHint?: boolean;
  matchExpression?: string;
  onChange?: (validated: ValidatedOptions) => void;
  onTargetChange?: (target: Target) => void;
}

export const MatchExpressionEvaluator: React.FC<MatchExpressionEvaluatorProps> = ({
  inlineHint,
  matchExpression,
  onChange,
  onTargetChange,
}) => {
  const [target, setTarget] = React.useState(NO_TARGET);
  const [valid, setValid] = React.useState(ValidatedOptions.default);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!matchExpression || !target.connectUrl) {
      setValid(ValidatedOptions.default);
      return;
    }
    try {
      const f = new Function('target', `return ${matchExpression}`);
      const res = f(_.cloneDeep(target));
      if (typeof res === 'boolean') {
        setValid(res ? ValidatedOptions.success : ValidatedOptions.warning);
        return;
      }
      setValid(ValidatedOptions.error);
      return;
    } catch (err) {
      setValid(ValidatedOptions.error);
      return;
    }
  }, [target, matchExpression, setValid]);

  React.useEffect(() => {
    if (onChange) {
      onChange(valid);
    }
  }, [onChange, valid]);

  React.useEffect(() => {
    onTargetChange && onTargetChange(target);
  }, [onTargetChange, target]);

  const statusLabel = React.useMemo(() => {
    switch (valid) {
      case ValidatedOptions.success:
        return (
          <Label color="green" icon={<CheckCircleIcon />}>
            Match Expression Matches Selected Target
          </Label>
        );
      case ValidatedOptions.warning:
        return (
          <Label color="orange" icon={<WarningTriangleIcon />}>
            Match Expression Valid, Does Not Match Selected Target
          </Label>
        );
      case ValidatedOptions.error:
        return (
          <Label color="red" icon={<ExclamationCircleIcon />}>
            Invalid Match Expression
          </Label>
        );
      default:
        if (!target.connectUrl) {
          return (
            <Label color="grey" icon={<InfoCircleIcon />}>
              No Target Selected
            </Label>
          );
        }
        return (
          <Label color="grey" icon={<InfoCircleIcon />}>
            No Match Expression
          </Label>
        );
    }
  }, [valid, target.connectUrl]);

  const exampleExpression = React.useMemo(() => {
    let body: string;
    if (!target || !target.alias || !target.connectUrl) {
      body = 'true';
    } else {
      body = `target.alias == '${target.alias}' || target.annotations.cryostat['PORT'] == ${target.annotations?.cryostat['PORT']}`;
    }
    body = JSON.stringify(body, null, 2);
    body = body.substring(1, body.length - 1);
    return body;
  }, [target]);

  const onSaveToClipboard = React.useCallback(() => {
    setCopied(true);
    navigator.clipboard.writeText(exampleExpression);
  }, [setCopied, exampleExpression]);

  const actions = React.useMemo(() => {
    return (
      <>
        <CodeBlockAction>
          <ClipboardCopyButton
            id="match-expression-copy-button"
            textId="match-expression-code-content"
            aria-label="Copy to clipboard"
            onClick={onSaveToClipboard}
            exitDelay={copied ? 1500 : 600}
            maxWidth="110px"
            variant="plain"
            onTooltipHidden={() => setCopied(false)}
          >
            {copied ? 'Copied!' : 'Click to copy to clipboard'}
          </ClipboardCopyButton>
        </CodeBlockAction>
      </>
    );
  }, [copied, onSaveToClipboard, setCopied]);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <TargetSelect simple onSelect={setTarget} />
        </StackItem>
        <StackItem>
          <Split hasGutter isWrappable>
            <SplitItem>{statusLabel}</SplitItem>
            <SplitItem>
              {inlineHint ? (
                <Tooltip
                  content={
                    <div>
                      Hint: try an expression like <br />
                      {exampleExpression}
                    </div>
                  }
                >
                  <HelpIcon />
                </Tooltip>
              ) : (
                <></>
              )}
            </SplitItem>
          </Split>
        </StackItem>
        {inlineHint ? (
          <StackItem>
            <Text>Hint: try an expression like</Text>
            <CodeBlock actions={actions}>
              <CodeBlockCode>{exampleExpression}</CodeBlockCode>
            </CodeBlock>
          </StackItem>
        ) : (
          <></>
        )}
        <StackItem>
          <SerializedTarget target={target} />
        </StackItem>
      </Stack>
    </>
  );
};
