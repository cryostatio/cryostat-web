import * as React from 'react';
import { Grid, GridItem } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';

export const RecordingList = (props) => {
  const context = React.useContext(ServiceContext);

  return (
    <div>
      Recording List
    </div>
  );
};
