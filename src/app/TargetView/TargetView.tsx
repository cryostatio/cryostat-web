import * as React from 'react';
import { Grid, GridItem, PageSection, Title } from '@patternfly/react-core';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';

interface TargetViewProps {
  children: any;
  pageTitle: string;
  targetSelectWidth?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  allowDisconnect?: boolean;
}

export const TargetView = (props: TargetViewProps) => {

  return (<>
    <PageSection>
      <Title size="lg">{props.pageTitle}</Title>
      <Grid gutter="md">
        <GridItem span={props.targetSelectWidth || 4}>
          <TargetSelect allowDisconnect={props.allowDisconnect || false} />
        </GridItem>
        {
          React.Children.map(props.children, child => (
            <GridItem span={12}>
              {child}
            </GridItem>
          ))
        }
      </Grid>
    </PageSection>
  </>);

}
