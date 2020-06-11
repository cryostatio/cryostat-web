import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { Card, CardBody, CardHeader, Tab, Tabs, Text, TextVariants } from '@patternfly/react-core';
import { EventTemplates } from './EventTemplates';
import { EventTypes } from './EventTypes';
import { NoTargetSelected } from '@app/NoTargetSelected/NoTargetSelected';

export const Events = () => {
  const context = React.useContext(ServiceContext);
  const [activeTab, setActiveTab] = React.useState(0);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    const sub = context.commandChannel.isConnected().subscribe(setConnected);
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  const handleTabSelect = (evt, idx) => {
    setActiveTab(idx);
  }

  return (<>
    <TargetView pageTitle="Events">
      {
        connected ?
          <Card>
            <CardHeader><Text component={TextVariants.h4}>Events</Text></CardHeader>
            <CardBody>
              <Tabs isFilled activeKey={activeTab} onSelect={handleTabSelect}>
                <Tab eventKey={0} title="Event Templates">
                  <EventTemplates />
                </Tab>
                <Tab eventKey={1} title="Event Types">
                  <EventTypes />
                </Tab>
              </Tabs>
            </CardBody>
          </Card>
        : <NoTargetSelected />
      }
    </TargetView>
  </>);

}
