import * as React from 'react';
import { Grid, GridItem, PageSection, Title } from '@patternfly/react-core';
import { TargetView } from '@app/TargetView/TargetView';

export const Dashboard = (props) => {

  return (
    <TargetView pageTitle="Dashboard" allowDisconnect={true} targetSelectWidth={8} />
  );

}
