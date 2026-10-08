import { prisma } from '@/lib/prisma';
import { publishRealtimeEvent } from '@/lib/realtime';
import { sendEmail } from '@/lib/email-service';
import { isValidPhoneNumber, formatToE164 } from '@/lib/phone-utils';
import {
  CommunicationChannel,
  CommunicationStatus,
} from '@prisma/client';
import {
  CommunicationMessage,
  CommunicationSendResult,
  EmailProvider,
  WhatsAppProvider,
  SMSProvider,
  DispatchOptions,
} from '@/lib/communication-types';

// ------------------- Default Provider Implementations -------------------

class SimulatedProvider implements EmailProvider, WhatsAppProvider, SMSProvider {
  name: string;
  channel: CommunicationChannel;

  constructor(channel: CommunicationChannel, name = 'SIMULATED') {
    this.channel = channel;
    this.name = name;
  }

  async send(message: CommunicationMessage): Promise<CommunicationSendResult> {
    console.log(`[SIMULATED ${this.channel}] To: ${message.to} | Subject: "${message.subject || 'Notice'}" | Body: "${message.text}"`);
    return {
      success: true,
      provider: this.name,
      messageId: `sim_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      simulated: true,
    };
  }
}

class SMTPProviderImpl implements EmailProvider {
  name = 'SMTP';

  async send(message: CommunicationMessage): Promise<CommunicationSendResult> {
    const res = await sendEmail({
      to: message.to,
      subject: message.subject || 'School Notification',
      text: message.text,
      html: message.html,
    });

    return {
      success: res.success,
      provider: this.name,
      messageId: res.messageId,
      simulated: res.simulated,
    };
  }
}

class TwilioWhatsAppProviderImpl implements WhatsAppProvider {
  name = 'TWILIO_WHATSAPP';

  async send(message: CommunicationMessage): Promise<CommunicationSendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromNum = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (!sid || !token) {
      return new SimulatedProvider('WHATSAPP', 'SIMULATED_WHATSAPP').send(message);
    }

    try {
      const basicAuth = Buffer.from(`${sid}:${token}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', fromNum.startsWith('whatsapp:') ? fromNum : `whatsapp:${fromNum}`);
      params.append('To', message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`);
      params.append('Body', message.text);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, provider: this.name, error: data.message || 'Twilio WhatsApp API Error' };
      }

      return { success: true, provider: this.name, messageId: data.sid };
    } catch (err: any) {
      return { success: false, provider: this.name, error: err.message || 'Network request failed' };
    }
  }
}

class TwilioSMSProviderImpl implements SMSProvider {
  name = 'TWILIO_SMS';

  async send(message: CommunicationMessage): Promise<CommunicationSendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromNum = process.env.TWILIO_SMS_NUMBER;

    if (!sid || !token || !fromNum) {
      return new SimulatedProvider('SMS', 'SIMULATED_SMS').send(message);
    }

    try {
      const basicAuth = Buffer.from(`${sid}:${token}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', fromNum);
      params.append('To', message.to);
      params.append('Body', message.text);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, provider: this.name, error: data.message || 'Twilio SMS API Error' };
      }

      return { success: true, provider: this.name, messageId: data.sid };
    } catch (err: any) {
      return { success: false, provider: this.name, error: err.message || 'Network request failed' };
    }
  }
}

// ------------------- Main Dispatcher Engine -------------------

export async function dispatchExternalCommunication(
  channel: CommunicationChannel,
  message: CommunicationMessage,
  options: DispatchOptions
) {
  try {
    // 1. Fetch user notification preferences & school settings
    const [user, schoolSetting] = await Promise.all([
      prisma.user.findUnique({
        where: { id: options.userId },
        include: { notificationPreference: true },
      }),
      prisma.notificationSetting.findFirst(),
    ]);

    if (!user || !user.isActive) return null;

    const testMode = schoolSetting ? schoolSetting.testModeEnabled : true;
    const pref = user.notificationPreference;

    // 2. Channel Enablement Check (User & School Toggles)
    if (channel === CommunicationChannel.EMAIL) {
      if (schoolSetting && !schoolSetting.emailEnabled) return null;
      if (pref && !pref.emailEnabled) return null;
    } else if (channel === CommunicationChannel.WHATSAPP) {
      if (schoolSetting && !schoolSetting.whatsappEnabled) return null;
      if (pref && !pref.whatsappEnabled) return null;
    } else if (channel === CommunicationChannel.SMS) {
      if (schoolSetting && !schoolSetting.smsEnabled) return null;
      if (pref && !pref.smsEnabled) return null;
    }

    // 3. Recipient Validation
    let recipientAddress = message.to;
    if (channel === CommunicationChannel.EMAIL) {
      recipientAddress = (user.email || message.to || '').trim();
      if (!recipientAddress || !recipientAddress.includes('@')) {
        return createFailedLog(options, channel, recipientAddress, 'Invalid email address');
      }
    } else {
      const rawPhone = user.phoneNumber || message.to;
      const formatted = formatToE164(rawPhone);
      if (!formatted) {
        return createFailedLog(options, channel, rawPhone || 'N/A', 'Invalid or missing E.164 phone number');
      }
      recipientAddress = formatted;
      message.to = formatted;
    }

    // 4. Idempotency Key Check
    const idempotencyKey = options.idempotencyKey || `idemp_${options.userId}_${channel}_${options.messageType}_${options.notificationId || Date.now()}`;
    const existingLog = await prisma.communicationLog.findUnique({
      where: { idempotencyKey },
    });

    if (existingLog && existingLog.status === CommunicationStatus.SENT) {
      return existingLog; // Already sent, prevent duplicate
    }

    // 5. Create or reuse PENDING Communication Log in DB
    let commLog = existingLog;
    if (!commLog) {
      commLog = await prisma.communicationLog.create({
        data: {
          notificationId: options.notificationId || null,
          userId: options.userId,
          channel,
          provider: testMode ? 'SIMULATED' : 'DEFAULT',
          messageType: options.messageType,
          recipient: recipientAddress,
          status: CommunicationStatus.PROCESSING,
          attemptCount: 1,
          idempotencyKey,
        },
      });
    } else {
      commLog = await prisma.communicationLog.update({
        where: { id: commLog.id },
        data: { status: CommunicationStatus.PROCESSING, attemptCount: commLog.attemptCount + 1 },
      });
    }

    // 6. Execute Provider Strategy
    let providerStrategy: EmailProvider | WhatsAppProvider | SMSProvider;

    if (testMode) {
      providerStrategy = new SimulatedProvider(channel);
    } else if (channel === CommunicationChannel.EMAIL) {
      providerStrategy = new SMTPProviderImpl();
    } else if (channel === CommunicationChannel.WHATSAPP) {
      providerStrategy = new TwilioWhatsAppProviderImpl();
    } else {
      providerStrategy = new TwilioSMSProviderImpl();
    }

    const sendResult = await providerStrategy.send(message);

    // 7. Update Delivery Status Log in DB
    const finalLog = await prisma.communicationLog.update({
      where: { id: commLog.id },
      data: {
        provider: sendResult.provider,
        status: sendResult.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
        sentAt: sendResult.success ? new Date() : null,
        failureReason: sendResult.error || null,
      },
    });

    // 8. Emit SSE Realtime Update for Admin Dashboard
    publishRealtimeEvent('communication:status_updated', 'dashboard', {
      logId: finalLog.id,
      channel,
      status: finalLog.status,
      recipient: finalLog.recipient,
    });

    return finalLog;
  } catch (error: any) {
    console.error(`[Communication Dispatcher Error] Channel ${channel}:`, error);
    return null;
  }
}

async function createFailedLog(options: DispatchOptions, channel: CommunicationChannel, recipient: string, reason: string) {
  try {
    return await prisma.communicationLog.create({
      data: {
        notificationId: options.notificationId || null,
        userId: options.userId,
        channel,
        provider: 'VALIDATOR',
        messageType: options.messageType,
        recipient,
        status: CommunicationStatus.FAILED,
        failureReason: reason,
      },
    });
  } catch {
    return null;
  }
}
