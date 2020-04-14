import * as React from 'react';
import { Grid, GridItem, PageSection, Title } from '@patternfly/react-core';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';

interface TargetViewProps {
  children: any;
  pageTitle: string;
  allowDisconnect: boolean;
}

export const TargetView = (props: TargetViewProps) => {

  return (<>
    <PageSection>
      <Title size="lg">{props.pageTitle}</Title>
      <Grid gutter="md">
        <GridItem span={4}>
          <TargetSelect allowDisconnect={props.allowDisconnect} />
        </GridItem>
        <GridItem span={12}>
          {props.children}
        </GridItem>
      </Grid>
    </PageSection>
  </>);

}
