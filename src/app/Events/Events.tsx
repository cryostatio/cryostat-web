import * as React from 'react'
import { Card, CardBody, CardHeader, Tabs, Tab, TabsVariant, TabContent, Text, TextVariants } from '@patternfly/react-core';
import { TargetView } from '@app/TargetView/TargetView';
import { EventTemplates } from './EventTemplates';
import { EventTypes } from './EventTypes';

export const Events = (props) => {
  const [activeTab, setActiveTab] = React.useState(0);

  const handleTabSelect = (evt, idx) => {
    setActiveTab(idx);
  }

  return (<>
    <TargetView pageTitle="Events">
      <Card>
        <CardHeader><Text component={TextVariants.h4}>Events</Text></CardHeader>
        <CardBody>
          <Tabs isFilled mountOnEnter unmountOnExit activeKey={activeTab} onSelect={handleTabSelect}>
            <Tab eventKey={0} title="Event Templates">
              <EventTemplates />
            </Tab>
            <Tab eventKey={1} title="Event Types">
              <EventTypes />
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </TargetView>
  </>);

}
