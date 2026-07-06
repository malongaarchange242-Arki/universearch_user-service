import { createMailer as createNodeMailer } from '../../mail/config/mailer';

let mailerInstance: any = null;

export const getMailer = () => {
  if (!mailerInstance) {
    mailerInstance = createNodeMailer();
  }
  return mailerInstance;
};

export const closeMailer = async (): Promise<void> => {
  mailerInstance = null;
};
