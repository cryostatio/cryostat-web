import * as React from 'react';
import { PageSection, Stack, StackItem, Title } from '@patternfly/react-core';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';

interface TargetViewProps {
  children?: any;
  pageTitle: string;
  targetSelectWidth?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  compactSelect: boolean;
  allowDisconnect?: boolean;
}

export const TargetView = (props: TargetViewProps) => {

  return (<>
    <PageSection>
      <Title size="lg">{props.pageTitle}</Title>
      <Stack gutter="md">
        <StackItem>
          <TargetSelect isCompact={props.compactSelect == null ? true : props.compactSelect} allowDisconnect={props.allowDisconnect || false} />
        </StackItem>
        {
          React.Children.map(props.children, child => (
            <StackItem isFilled>
              {child}
            </StackItem>
          ))
        }
      </Stack>
    </PageSection>
  </>);

}
