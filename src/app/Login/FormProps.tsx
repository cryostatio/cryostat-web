import * as React from 'react';

export interface FormProps {
  onSubmit(evt: React.SyntheticEvent<HTMLInputElement>, token: string, authMethod: string): void;
}
