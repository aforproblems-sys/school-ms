import { CommunicationChannel } from '@prisma/client';

export interface CommunicationMessage {
  to: string; // Email address or E.164 phone number
  subject?: string;
  text: string;
  html?: string;
  templateId?: string;
  mediaUrl?: string;
}

export interface CommunicationSendResult {
  success: boolean;
  provider: string;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

export interface EmailProvider {
  name: string;
  send(message: CommunicationMessage): Promise<CommunicationSendResult>;
}

export interface WhatsAppProvider {
  name: string;
  send(message: CommunicationMessage): Promise<CommunicationSendResult>;
}

export interface SMSProvider {
  name: string;
  send(message: CommunicationMessage): Promise<CommunicationSendResult>;
}

export interface DispatchOptions {
  userId: string;
  messageType: string;
  notificationId?: string;
  idempotencyKey?: string;
}
