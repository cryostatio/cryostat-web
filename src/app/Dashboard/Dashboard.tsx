import * as React from 'react';
import { Grid, GridItem, PageSection, Title } from '@patternfly/react-core';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';

export const Dashboard = (props) => {

  return (
    <PageSection>
      <Title size="lg">Dashboard</Title>
      <Grid gutter="md">
        <GridItem span={8}>
          <TargetSelect />
        </GridItem>
      </Grid>
    </PageSection>
  );

}
