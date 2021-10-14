import * as React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardTitle, CardBody, CardFooter } from '@patternfly/react-core';

export const NotFoundCard = ({title, bodyText, linkText, linkPath}) => {
  return(<>
    <Card className='pf-c-card-not-found'>
      <CardTitle>{title}</CardTitle>
      <CardBody>{bodyText}</CardBody>
      <CardFooter className='pf-c-card-not-found__footer'>
        <Link to={linkPath}>{linkText}</Link>
      </CardFooter>
    </Card>
    </>);
}