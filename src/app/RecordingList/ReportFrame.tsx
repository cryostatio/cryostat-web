/*
 * Copyright (c) 2020 Red Hat, Inc.
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
import { NotificationsContext } from '@app/Notifications/Notifications';
import { Recording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Button, Level, LevelItem, Spinner, Text } from '@patternfly/react-core';
import { Spinner2Icon } from '@patternfly/react-icons';
import { first } from 'rxjs/operators';

export interface ReportFrameProps extends React.HTMLProps<HTMLIFrameElement> {
  recording: Recording;
}

export const ReportFrame: React.FunctionComponent<ReportFrameProps> = React.memo((props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [report, setReport] = React.useState(undefined as string | undefined);
  const [loaded, setLoaded] = React.useState(false);
  const { recording, ...rest } = props;
  const addSubscription = useSubscriptions();

  const handleReport = React.useCallback(report => {
    setReport(report);
    setLoaded(true);
  }, []);

  const loadReport = React.useCallback(() => {
    setLoaded(false);
    addSubscription(
      context.reports.report(recording).pipe(first()).subscribe(
        report => handleReport(report),
        err => notifications.danger(err),
      )
    );
  }, [recording, setLoaded, addSubscription, context.reports, handleReport, notifications]);

  React.useLayoutEffect(() => {
    const sub = context.reports.report(recording).pipe(first()).subscribe(
      report => handleReport(report),
      err => notifications.danger(err),
    );
    return () =>  sub.unsubscribe();
  }, [context.reports, notifications, recording, props, props.recording, handleReport]);

  const onLoad = () => setLoaded(true);

  return (<>
    { !loaded && <Spinner /> }
    <Level>
      <LevelItem>
        <Text>Automated Analysis:</Text>
      </LevelItem>
      <LevelItem>
        <Button
          isDisabled={!loaded}
          onClick={loadReport}
          variant='control'
          icon={<Spinner2Icon />}
        />
      </LevelItem>
    </Level>
    <iframe srcDoc={report} {...rest} onLoad={onLoad} hidden={!loaded} />
  </>);
});
