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
import { Recording, isHttpError } from '@app/Shared/Services/Api.service';
import { isGenerationError } from '@app/Shared/Services/Report.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Spinner } from '@patternfly/react-core';
import * as React from 'react';
import { first } from 'rxjs/operators';

export interface ReportFrameProps extends React.HTMLProps<HTMLIFrameElement> {
  isExpanded: boolean;
  recording: Recording;
}

export const ReportFrame: React.FC<ReportFrameProps> = (props) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const [report, setReport] = React.useState(undefined as string | undefined);
  const [loaded, setLoaded] = React.useState(false);
  const { isExpanded, recording, ...rest } = props;

  React.useLayoutEffect(() => {
    if (!props.isExpanded) {
      return;
    }
    addSubscription(
      context.reports
        .report(recording)
        .pipe(first())
        .subscribe({
          next: setReport,
          error: (err) => {
            if (isGenerationError(err)) {
              err.messageDetail.pipe(first()).subscribe((detail) => setReport(detail));
            } else if (isHttpError(err)) {
              setReport(err.message);
            } else {
              setReport(JSON.stringify(err));
            }
          },
        }),
    );
  }, [addSubscription, context.reports, recording, isExpanded, setReport, props]);

  const onLoad = () => setLoaded(true);

  return (
    <>
      {!loaded && <Spinner />}
      <iframe title="Automated Analysis" srcDoc={report} {...rest} onLoad={onLoad} hidden={!(loaded && isExpanded)} />
    </>
  );
};
