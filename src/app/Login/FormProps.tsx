export interface FormProps {
  onSubmit(evt: Event, token: string, authMethod: string): void;
}
