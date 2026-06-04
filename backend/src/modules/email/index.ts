export { sendEmail, type SendEmailParams, type SendEmailResult, type EmailAttachment } from './email.service';
export { renderQuoteSentEmail, type QuoteSentEmailVars } from './templates/quote-sent';
export { renderInvoiceSentEmail, type InvoiceSentEmailVars } from './templates/invoice-sent';
export {
  renderBookingConfirmationEmail,
  type BookingConfirmationEmailVars,
} from './templates/booking-confirmation';
