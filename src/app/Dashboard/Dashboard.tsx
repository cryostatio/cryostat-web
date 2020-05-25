import * as React from 'react';
import { TargetView } from '@app/TargetView/TargetView';

export const Dashboard = (props) => {

  return (
    <TargetView pageTitle="Dashboard" allowDisconnect={true} compactSelect={false} />
  );

}
