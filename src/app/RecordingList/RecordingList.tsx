import * as React from 'react';
import { Card, CardBody, CardHeader, Text, TextVariants  } from '@patternfly/react-core';
import { TargetView } from '@app/TargetView/TargetView';
import { ActiveRecordingsList } from './ActiveRecordingsList';

export interface Recording {
  id: number;
  name: string;
  state: RecordingState;
  startTime: number;
  duration: number;
  continuous: boolean;
  toDisk: boolean;
  maxSize: number;
  maxAge: number;
  downloadUrl: string;
  reportUrl: string;
}

export enum RecordingState {
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
}

export const RecordingList = (props) => {
  return (
    <TargetView pageTitle="Recordings">
      <Card>
        <CardHeader><Text component={TextVariants.h4}>Active Recordings</Text></CardHeader>
        <CardBody>
          <ActiveRecordingsList />
        </CardBody>
      </Card>
    </TargetView>
  );
};
