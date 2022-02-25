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
import * as React from 'react';
import { CodeBlock, CodeBlockCode, Label, Stack, StackItem, Text, ValidatedOptions } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Target } from '@app/Shared/Services/Target.service';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';
import { NoTargetSelected } from '@app/TargetView/NoTargetSelected';
import {CheckCircleIcon, ExclamationCircleIcon, InfoCircleIcon, WarningTriangleIcon} from '@patternfly/react-icons';

export interface MatchExpressionEvaluatorProps {
  matchExpression?: string;
  onChange?: (validated: ValidatedOptions) => void;
}

export const MatchExpressionEvaluator: React.FunctionComponent<MatchExpressionEvaluatorProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [target, setTarget] = React.useState(undefined as Target | undefined);
  const [valid, setValid] = React.useState(ValidatedOptions.default);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(setTarget)
    );
  }, [context, context.target]);

  React.useEffect(() => {
    if (!props.matchExpression || !target?.connectUrl) {
      setValid(ValidatedOptions.default);
      return;
    }
    try {
      const f = new Function('target', `return ${props.matchExpression}`);
      const res = f(target);
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
  }, [target, props.matchExpression]);

  React.useEffect(() => {
    if (!!props.onChange) {
      props.onChange(valid);
    }
  }, [props.onChange, valid]);

  const statusLabel = React.useMemo(() => {
    switch (valid) {
      case ValidatedOptions.success:
        return (<Label color="green" icon={<CheckCircleIcon />}>Match Expression Matches Selected Target</Label>);
      case ValidatedOptions.warning:
        return (<Label color="orange" icon={<WarningTriangleIcon />}>Match Expression Valid, Does Not Match Selected Target</Label>);
      case ValidatedOptions.error:
        return (<Label color="red" icon={<ExclamationCircleIcon />}>Invalid Match Expression</Label>);
      default:
        return (<Label color="grey" icon={<InfoCircleIcon />}>No Match Expression</Label>);
    }
  }, [valid]);

  const exampleExpression = React.useMemo(() => {
    let body: string;
    if (!target || !target?.alias || !target?.connectUrl) {
      body = 'true';
    } else {
      body = `target.alias == '${target?.alias}' || target.annotations.cryostat['PORT'] == ${target?.annotations?.cryostat['PORT']}`;
    }
    body = JSON.stringify(body, null, 2);
    body = body.substring(1, body.length - 1);
    return (<>
      <CodeBlock>
        <CodeBlockCode>
          { body }
        </CodeBlockCode>
      </CodeBlock>
    </>);
  },[target]);

  return (<>
    <Stack hasGutter>
      <StackItem>
        <TargetSelect/>
      </StackItem>
      <StackItem>
        { statusLabel }
      </StackItem>
      <StackItem>
        <Text>
          Hint: try an expression like
        </Text>
        { exampleExpression }
      </StackItem>
      <StackItem>
        {
          !!target?.alias && !!target?.connectUrl ?
            <CodeBlock>
              <CodeBlockCode>
                { JSON.stringify(target, null, 2) }
              </CodeBlockCode>
            </CodeBlock>
            :
            <NoTargetSelected />
        }
      </StackItem>
    </Stack>
  </>);

};
