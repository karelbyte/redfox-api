import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Not, Repository } from 'typeorm';
import { BotProvider, BotSettings } from '../models/bot-settings.entity';
import {
  BotConversation,
  BotConversationCandidateProduct,
  BotConversationContext,
  BotConversationDraftItem,
  BotConversationStatus,
  BotConversationStep,
} from '../models/bot-conversation.entity';
import { BotMessage, BotMessageDirection } from '../models/bot-message.entity';
import { Client } from '../models/client.entity';
import { Product } from '../models/product.entity';
import { CompanySettings } from '../models/company-settings.entity';
import { BotDetectedIntent } from '../interfaces/bot-intent-interpreter.interface';
import { RuleBasedBotIntentInterpreterService } from './rule-based-bot-intent-interpreter.service';
import { TenantContext } from './tenant-context.service';
import { SurrogateService } from './surrogate.service';
import { QuotationService } from './quotation.service';
import { QuotationBotPdfService } from './quotation-bot-pdf.service';
import { EmailService } from './email.service';
import { CreateQuotationDto } from '../dtos/quotation/create-quotation.dto';
import { CreateQuotationDetailDto } from '../dtos/quotation-detail/create-quotation-detail.dto';

type SupportedBotLocale = 'es' | 'en' | 'zh';

type ConversationCopy = {
  companyFallback: string;
  assistantFallback: string;
  genericHelp: string;
  mainMenu: string;
  askMenuChoice: string;
  askClientName: string;
  askClientEmail: string;
  askProduct: string;
  askQuantity: (productName: string) => string;
  invalidClientName: string;
  invalidEmail: string;
  noProductsFound: string;
  selectProduct: string;
  invalidSelection: string;
  invalidQuantity: string;
  reviewHeader: string;
  reviewOptions: string[];
  askReviewChoice: string;
  quoteCreated: (code: string, total: number) => string;
  quoteCreatedNextStep: string;
  quoteFailed: string;
  handoff: string;
  multiplePriceMatches: string;
  multipleStockMatches: string;
  cancelled: string;
  expired: string;
  stockLabel: string;
  quantityLabel: string;
  totalLabel: string;
  subtotal: string;
  tax: string;
  addMoreAcknowledgement: string;
  clientRegistered: (name: string) => string;
  emailRegistered: (email: string) => string;
  emailSkipped: string;
  welcomeBack: (name: string) => string;
  intro: (assistant: string, company: string) => string;
  quotePdfAttached: string;
  quoteEmailSent: (email: string) => string;
  quoteEmailFailed: string;
  priceConsultIntro: string;
  priceNotFound: string;
  priceResponse: (productName: string, price: number) => string;
  stockConsultIntro: string;
  stockNotFound: string;
  stockResponse: (productName: string, available: boolean) => string;
  stockAvailableLabel: string;
  stockUnavailableLabel: string;
  productAlreadyInCart: string;
};

export interface ProcessIncomingBotMessageParams {
  organizationId: string;
  remoteJid: string;
  messageText: string;
  settings: BotSettings;
}

export interface ProcessIncomingBotMessageResult {
  reply: string | null;
  replyKind: 'conversation' | 'generic' | 'silent';
  conversationId?: string | null;
  attachment?: {
    buffer: Buffer;
    fileName: string;
    mimetype: string;
    caption?: string;
  } | null;
}

const CONVERSATION_COPY: Record<SupportedBotLocale, ConversationCopy> = {
  es: {
    companyFallback: 'nuestro equipo',
    assistantFallback: 'tu asistente de ventas',
    genericHelp:
      'Puedo ayudarte a crear una cotización formal. Escríbeme el producto que buscas o pide una cotización.',
    mainMenu:
      '¿Qué necesitas? Elige una opción:\n1. Crear cotización\n2. Consultar precios\n3. Consultar existencias\n4. Hablar con un asesor',
    askMenuChoice: 'Respóndeme con 1, 2, 3 o 4 para continuar.',
    askClientName:
      'Antes de crear la cotización, compárteme tu nombre para registrarte como cliente.',
    askClientEmail:
      'Ahora compárteme tu correo electrónico para enviarte la cotización en PDF. Si prefieres omitirlo, responde omitir. Escribe "menu" para volver al menú principal.',
    askProduct:
      'Perfecto. Ahora escríbeme el nombre, código o SKU del producto que deseas cotizar. O escribe "menu" para volver al menú principal.',
    askQuantity: (productName) =>
      `Indícame la cantidad que necesitas para ${productName}. Escribe "menu" para volver al menú principal.`,
    invalidClientName:
      'Necesito un nombre un poco más claro para registrar al cliente. Puedes enviarme tu nombre completo.',
    invalidEmail:
      'Ese correo no parece válido. Envíame un email correcto o responde omitir si prefieres continuar sin correo.',
    noProductsFound:
      'No encontré productos con esa referencia. Intenta con otro nombre, código o SKU.',
    selectProduct:
      'Encontré varias opciones. Respóndeme con el número del producto correcto:',
    invalidSelection:
      'No pude identificar la opción elegida. Respóndeme con el número del producto.',
    invalidQuantity:
      'La cantidad no es válida. Envíame un número mayor que 0, por ejemplo 2 o 1.5.',
    reviewHeader: 'Este es el resumen actual de tu cotización:',
    reviewOptions: [
      '1. Agregar otro producto',
      '2. Crear cotización formal',
      '3. Volver al menú principal',
      '4. Hablar con un asesor',
    ],
    askReviewChoice: 'Respóndeme con 1, 2, 3 o 4 para continuar.',
    quoteCreated: (code, total) =>
      `Tu cotización fue creada correctamente con el folio ${code}. Total estimado: $${total.toFixed(2)}.`,
    quoteCreatedNextStep:
      'La cotización quedó registrada en nuestro sistema. Si deseas otra cotización, escríbeme otro producto. Si prefieres atención humana, responde asesor.',
    quoteFailed:
      'No pude crear la cotización en este momento. Intenta nuevamente o pide ayuda a un asesor.',
    handoff:
      'Gracias por tu interés. Voy a dejar la conversación lista para que un asesor continúe contigo. Un asesor se pondrá en contacto pronto para atenderte personalmente.',
    multiplePriceMatches:
      'Encontré varios productos que coinciden. Aquí están sus precios:',
    multipleStockMatches:
      'Encontré varios productos que coinciden. Aquí están sus precios y disponibilidad:',
    cancelled:
      'He cancelado esta cotización. Cuando quieras empezar una nueva, solo pídemela.',
    expired:
      'La conversación anterior ya expiró. Vamos a empezar una cotización nueva.',
    stockLabel: 'Stock',
    stockAvailableLabel: 'Disponible',
    stockUnavailableLabel: 'No disponible',
    quantityLabel: 'Cantidad',
    totalLabel: 'Total estimado',
    subtotal: 'Subtotal',
    tax: 'Impuestos',
    productAlreadyInCart: 'Este producto ya está en tu cotización. Si quieres agregar más cantidad, modifica la cantidad existente o elige otro producto.',
    addMoreAcknowledgement:
      'Perfecto, envíame el siguiente producto que deseas agregar.',
    clientRegistered: (name) =>
      `Listo, ${name}. Ya te tengo registrado para esta cotización.`,
    emailRegistered: (email) =>
      `Perfecto, también registré tu correo: ${email}.`,
    emailSkipped: 'Continuaremos sin correo por ahora.',
    welcomeBack: (name) => `Bienvenido otra vez, ${name}.`,
    intro: (assistant, company) => `Hola, soy ${assistant} de ${company}.`,
    quotePdfAttached: 'Te adjunto el PDF de tu cotización por este medio.',
    quoteEmailSent: (email) => `También envié una copia al correo ${email}.`,
    quoteEmailFailed:
      'La cotización quedó registrada, pero no pude enviarla por correo en este momento.',
    priceConsultIntro:
      'Perfecto, escríbeme el nombre, código o SKU del producto para consultar su precio. Escribe "menu" para volver al menú principal.',
    priceNotFound: 'No encontré ese producto. Intenta con otro nombre, código o SKU.',
    priceResponse: (productName, price) =>
      `${productName} tiene un precio de $${price.toFixed(2)}.`,
    stockConsultIntro:
      'Claro, escríbeme el nombre, código o SKU del producto para consultar su disponibilidad. Escribe "menu" para volver al menú principal.',
    stockNotFound: 'No encontré ese producto en nuestro sistema.',
    stockResponse: (productName, available) =>
      available
        ? `${productName} está disponible.`
        : `${productName} no está disponible.`,
  },
  en: {
    companyFallback: 'our team',
    assistantFallback: 'your sales assistant',
    genericHelp:
      'I can help you create a formal quotation. Send me the product you need or ask for a quotation.',
    mainMenu:
      'What do you need? Choose an option:\n1. Create quotation\n2. Check prices\n3. Check availability\n4. Talk to an agent',
    askMenuChoice: 'Reply with 1, 2, 3 or 4 to continue.',
    askClientName:
      'Before creating the quotation, please share your name so I can register you as a client.',
    askClientEmail:
      'Now please share your email address so I can send your quotation PDF. If you prefer to skip it, reply skip. Type "menu" to go back to the main menu.',
    askProduct:
      'Perfect. Now send me the product name, code or SKU you want to quote. Or type "menu" to go back to the main menu.',
    askQuantity: (productName) =>
      `Tell me the quantity you need for ${productName}. Type "menu" to go back to the main menu.`,
    invalidClientName:
      'I need a clearer name to register the client. You can send me your full name.',
    invalidEmail:
      'That email does not look valid. Send a valid email address or reply skip to continue without it.',
    noProductsFound:
      'I could not find products matching that reference. Try another name, code or SKU.',
    selectProduct:
      'I found several options. Reply with the number of the correct product:',
    invalidSelection:
      'I could not identify the selected option. Reply with the product number.',
    invalidQuantity:
      'That quantity is not valid. Send me a number greater than 0, for example 2 or 1.5.',
    reviewHeader: 'This is the current summary of your quotation:',
    reviewOptions: [
      '1. Add another product',
      '2. Create formal quotation',
      '3. Back to main menu',
      '4. Talk to an agent',
    ],
    askReviewChoice: 'Reply with 1, 2, 3 or 4 to continue.',
    quoteCreated: (code, total) =>
      `Your quotation was created successfully with code ${code}. Estimated total: $${total.toFixed(2)}.`,
    quoteCreatedNextStep:
      'The quotation was registered in our system. If you want another quotation, send me another product. If you prefer human assistance, reply agent.',
    quoteFailed:
      'I could not create the quotation right now. Please try again or ask for an agent.',
    handoff:
      'Thank you for your interest. I will leave the conversation ready for a sales agent to continue with you. An agent will contact you soon to assist you personally.',
    multiplePriceMatches:
      'I found several matching products. Here are their prices:',
    multipleStockMatches:
      'I found several matching products. Here are their prices and availability:',
    cancelled:
      'I have cancelled this quotation. When you want a new one, just ask me again.',
    expired:
      'The previous conversation has expired. Let us start a new quotation.',
    stockLabel: 'Stock',
    stockAvailableLabel: 'Available',
    stockUnavailableLabel: 'Not available',
    quantityLabel: 'Quantity',
    totalLabel: 'Estimated total',
    subtotal: 'Subtotal',
    tax: 'Taxes',
    productAlreadyInCart: 'This product is already in your quotation. If you want to add more quantity, modify the existing quantity or choose another product.',
    addMoreAcknowledgement:
      'Perfect, send me the next product you want to add.',
    clientRegistered: (name) =>
      `Done, ${name}. I already have you registered for this quotation.`,
    emailRegistered: (email) =>
      `Perfect, I also registered your email: ${email}.`,
    emailSkipped: 'We will continue without an email for now.',
    welcomeBack: (name) => `Welcome back, ${name}.`,
    intro: (assistant, company) => `Hi, I am ${assistant} from ${company}.`,
    quotePdfAttached: 'I am attaching the PDF of your quotation here.',
    quoteEmailSent: (email) => `I also sent a copy to ${email}.`,
    quoteEmailFailed:
      'The quotation was registered, but I could not send it by email right now.',
    priceConsultIntro:
      'Sure, send me the product name, code or SKU to check its price. Type "menu" to go back to the main menu.',
    priceNotFound: 'I could not find that product. Try another name, code or SKU.',
    priceResponse: (productName, price) =>
      `${productName} costs $${price.toFixed(2)}.`,
    stockConsultIntro:
      'Of course, send me the product name, code or SKU to check its availability. Type "menu" to go back to the main menu.',
    stockNotFound: 'I could not find that product in our system.',
    stockResponse: (productName, available) =>
      available
        ? `${productName} is available.`
        : `${productName} is not available.`,
  },
  zh: {
    companyFallback: '我们的团队',
    assistantFallback: '您的销售助手',
    genericHelp:
      '我可以帮你创建正式报价。请发送你要询价的产品，或直接说明需要报价。',
    mainMenu:
      '你需要什么？请选择一个选项：\n1. 创建报价\n2. 查询价格\n3. 查询库存\n4. 转人工顾问',
    askMenuChoice: '请回复 1、2、3 或 4 继续。',
    askClientName: '在创建报价前，请先告诉我你的姓名，以便把你登记为客户。',
    askClientEmail:
      '现在请告诉我你的电子邮箱，我可以把报价 PDF 发给你。如果你想跳过，请回复 跳过。输入"menu"返回主菜单。',
    askProduct: '好的。现在请发送你要报价的产品名称、代码或 SKU。或输入"menu"返回主菜单。',
    askQuantity: (productName) => `请告诉我 ${productName} 需要的数量。输入"menu"返回主菜单。`,
    invalidClientName: '我需要更清楚的客户姓名。你可以直接发送完整姓名。',
    invalidEmail: '这个邮箱看起来无效。请发送正确的邮箱，或回复 跳过 继续。',
    noProductsFound:
      '我没有找到符合该条件的产品。请换一个名称、代码或 SKU 再试一次。',
    selectProduct: '我找到了多个选项。请回复正确产品前面的编号：',
    invalidSelection: '我无法识别你选择的选项。请直接回复产品编号。',
    invalidQuantity: '数量无效。请发送大于 0 的数字，例如 2 或 1.5。',
    reviewHeader: '这是你当前报价的汇总：',
    reviewOptions: [
      '1. 再添加一个产品',
      '2. 创建正式报价',
      '3. 返回主菜单',
      '4. 转人工顾问',
    ],
    askReviewChoice: '请回复 1、2、3 或 4 继续。',
    quoteCreated: (code, total) =>
      `你的报价已成功创建，编号为 ${code}。预估总额：$${total.toFixed(2)}。`,
    quoteCreatedNextStep:
      '这份报价已经登记到系统中。如果你还要继续报价，请直接发送下一个产品；如果你需要人工协助，请回复顾问。',
    quoteFailed: '我暂时无法创建报价。请稍后再试，或联系人工顾问。',
    handoff: '感谢您的关注。我会把这段对话转给销售顾问继续跟进。一位顾问将很快联系您亲自为您服务。',
    multiplePriceMatches: '我找到多个匹配的产品。以下是它们的价格：',
    multipleStockMatches: '我找到多个匹配的产品。以下是它们的价格和库存：',
    cancelled: '这次报价已经取消。你想重新开始时，直接告诉我即可。',
    expired: '之前的会话已经过期。我们重新开始一份新的报价。',
    stockLabel: '库存',
    stockAvailableLabel: '有库存',
    stockUnavailableLabel: '无库存',
    quantityLabel: '数量',
    totalLabel: '预估总额',
    subtotal: '小计',
    tax: '税额',
    productAlreadyInCart: '此产品已在您的报价中。如果您想添加更多数量，请修改现有数量或选择其他产品。',
    addMoreAcknowledgement: '好的，请发送下一个要加入报价的产品。',
    clientRegistered: (name) => `好的，${name}，我已经把你登记到本次报价里了。`,
    emailRegistered: (email) => `好的，我也记录了你的邮箱：${email}。`,
    emailSkipped: '我们先在没有邮箱的情况下继续。',
    welcomeBack: (name) => `欢迎回来，${name}。`,
    intro: (assistant, company) => `你好，我是 ${company} 的${assistant}。`,
    quotePdfAttached: '我会在这里附上你的报价 PDF。',
    quoteEmailSent: (email) => `我也已经把一份副本发送到 ${email}。`,
    quoteEmailFailed: '报价已经登记到系统中，但我暂时无法通过邮件发送。',
    priceConsultIntro:
      '好的，请发送产品名称、代码或 SKU，我会查询价格。输入"menu"返回主菜单。',
    priceNotFound: '我没有找到该产品。请尝试另一个名称、代码或 SKU。',
    priceResponse: (productName, price) =>
      `${productName} 的价格是 $${price.toFixed(2)}。`,
    stockConsultIntro:
      '当然，请发送产品名称、代码或 SKU，我会查询库存。输入"menu"返回主菜单。',
    stockNotFound: '我在系统中没有找到该产品。',
    stockResponse: (productName, available) =>
      available
        ? `${productName} 有库存。`
        : `${productName} 没有库存。`,
  },
};

@Injectable()
export class BotConversationService {
  private readonly logger = new Logger(BotConversationService.name);

  constructor(
    @InjectRepository(BotConversation)
    private readonly conversationRepository: Repository<BotConversation>,
    @InjectRepository(BotMessage)
    private readonly messageRepository: Repository<BotMessage>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(CompanySettings)
    private readonly companySettingsRepository: Repository<CompanySettings>,
    private readonly interpreter: RuleBasedBotIntentInterpreterService,
    private readonly tenantContext: TenantContext,
    private readonly surrogateService: SurrogateService,
    private readonly quotationService: QuotationService,
    private readonly quotationBotPdfService: QuotationBotPdfService,
    private readonly emailService: EmailService,
  ) {}

  async processIncomingMessage(
    params: ProcessIncomingBotMessageParams,
  ): Promise<ProcessIncomingBotMessageResult> {
    const { organizationId, remoteJid, messageText, settings } = params;
    const normalizedMessage = this.normalize(messageText);
    const intent = this.interpreter.detectIntent(normalizedMessage);
    const customerPhone = this.extractCustomerPhone(remoteJid);
    const companyName = await this.getCompanyName(organizationId, settings);
    const copy = this.getCopy(settings.default_language);
    const intro = copy.intro(
      settings.assistant_name || copy.assistantFallback,
      companyName,
    );

    if (!settings.quotation_mode_enabled) {
      if (intent.type === 'handoff') {
        return {
          reply: settings.handoff_message || [intro, copy.handoff].join('\n'),
          replyKind: 'generic',
        };
      }

      return {
        reply: [
          intro,
          settings.welcome_message || copy.genericHelp,
          settings.handoff_message || copy.handoff,
        ].join('\n'),
        replyKind: 'generic',
      };
    }

    let conversation = await this.getActiveConversation(
      organizationId,
      settings.provider,
      customerPhone,
    );
    const knownClient = conversation
      ? null
      : await this.findClientByPhone(organizationId, customerPhone);
    let startedNewConversation = false;
    let shouldWelcomeReturningClient = false;

    if (conversation?.status === BotConversationStatus.HANDOFF) {
      // Check if user wants to start a new conversation, cancel, or end
      const lowerMessage = messageText.toLowerCase();
      if (intent.type === 'cancel' ||
          // Spanish farewells
          lowerMessage.includes('adios') || lowerMessage.includes('chau') ||
          // English farewells
          lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('see you') ||
          // Chinese farewells
          lowerMessage.includes('再见') || lowerMessage.includes('拜拜') || lowerMessage.includes('再会') ||
          // Spanish greetings
          lowerMessage.includes('hola') || lowerMessage.includes('buenos') ||
          // English greetings
          lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') ||
          // Chinese greetings
          lowerMessage.includes('你好') || lowerMessage.includes('您好') || lowerMessage.includes('喂') ||
          // New quotes - Spanish
          lowerMessage.includes('nueva') || lowerMessage.includes('cotizacion') ||
          // New quotes - English
          lowerMessage.includes('new') || lowerMessage.includes('quote') || lowerMessage.includes('quotation') ||
          // New quotes - Chinese
          lowerMessage.includes('新') || lowerMessage.includes('报价') || lowerMessage.includes('新的')) {
        // End the current handoff conversation and start fresh
        conversation.status = BotConversationStatus.COMPLETED;
        conversation.last_message_at = new Date();
        await this.conversationRepository.save(conversation);
        conversation = null; // Force starting a new conversation
      } else {
        return {
          reply: await this.buildHandoffReply(organizationId, settings, copy),
          replyKind: 'generic',
        };
      }
    }

    if (conversation) {
      conversation = await this.handlePossiblyExpiredConversation(conversation);
      if (!conversation) {
        return {
          reply: [intro, copy.expired, copy.genericHelp].join('\n'),
          replyKind: 'generic',
        };
      }

      // Check for back to menu commands
      if (this.isBackCommand(normalizedMessage)) {
        conversation.current_step = BotConversationStep.MENU;
        conversation.last_message_at = new Date();
        await this.conversationRepository.save(conversation);
        return {
          reply: [copy.mainMenu, copy.askMenuChoice].join('\n'),
          replyKind: 'conversation',
          conversationId: conversation.id,
        };
      }
    }

    if (!conversation) {
      if (intent.type === 'handoff') {
        return {
          reply:
            settings.handoff_message ||
            [
              intro,
              knownClient?.name ? copy.welcomeBack(knownClient.name) : null,
              copy.handoff,
            ]
              .filter(Boolean)
              .join('\n'),
          replyKind: 'generic',
        };
      }

      if (
        intent.type !== 'quote_request' &&
        !this.looksLikeProductQuery(normalizedMessage) &&
        !this.isGreetingMessage(normalizedMessage)
      ) {
        return {
          reply: [
            intro,
            knownClient?.name ? copy.welcomeBack(knownClient.name) : null,
            settings.welcome_message || copy.genericHelp,
            settings.handoff_message || copy.handoff,
          ]
            .filter(Boolean)
            .join('\n'),
          replyKind: 'generic',
        };
      }

      conversation = await this.startConversation({
        organizationId,
        provider: settings.provider,
        remoteJid,
        customerPhone,
        incomingText: messageText,
      });
      startedNewConversation = true;
      shouldWelcomeReturningClient =
        Boolean(conversation.client_id) &&
        conversation.current_step === BotConversationStep.CAPTURE_PRODUCT_QUERY;
    }

    await this.logMessage(
      conversation,
      settings.provider,
      BotMessageDirection.INCOMING,
      messageText,
      intent,
    );

    if (
      startedNewConversation &&
      conversation.current_step === BotConversationStep.MENU
    ) {
      const greeting = conversation.client_id && conversation.customer_name
        ? copy.welcomeBack(conversation.customer_name)
        : intro;
      return {
        reply: [greeting, copy.mainMenu, copy.askMenuChoice].join('\n'),
        replyKind: 'conversation',
        conversationId: conversation.id,
      };
    }

    if (
      startedNewConversation &&
      conversation.current_step === BotConversationStep.CAPTURE_CLIENT_NAME &&
      !conversation.client_id
    ) {
      return {
        reply: copy.askClientName,
        replyKind: 'conversation',
        conversationId: conversation.id,
      };
    }

    if (
      startedNewConversation &&
      conversation.current_step === BotConversationStep.CAPTURE_CLIENT_EMAIL &&
      conversation.customer_name
    ) {
      return {
        reply: [
          copy.welcomeBack(conversation.customer_name),
          copy.askClientEmail,
        ].join('\n'),
        replyKind: 'conversation',
        conversationId: conversation.id,
      };
    }

    if (intent.type === 'cancel') {
      return {
        reply: await this.cancelConversation(conversation, copy),
        replyKind: 'conversation',
        conversationId: conversation.id,
      };
    }

    if (intent.type === 'handoff') {
      return {
        reply: await this.handoffConversation(conversation, settings, copy),
        replyKind: 'conversation',
        conversationId: conversation.id,
      };
    }

    const context = this.ensureContext(conversation);
    if (
      conversation.current_step === BotConversationStep.CAPTURE_PRODUCT_QUERY &&
      !context.pendingProductQuery &&
      intent.type === 'quote_request' &&
      !this.looksLikeProductQuery(normalizedMessage)
    ) {
      return {
        reply: copy.askProduct,
        replyKind: 'conversation',
        conversationId: conversation.id,
      };
    }

    let reply = await this.advanceConversation(
      conversation,
      messageText,
      intent,
      settings,
      copy,
      intro,
    );

    let attachment: ProcessIncomingBotMessageResult['attachment'] = null;
    if (
      conversation.status === BotConversationStatus.COMPLETED &&
      conversation.quotation_id
    ) {
      const delivery = await this.prepareQuotationDelivery(
        conversation,
        settings,
        copy,
      );
      attachment = delivery.attachment;
      if (delivery.message) {
        reply = [reply, delivery.message].join('\n');
      }
    } else if (
      shouldWelcomeReturningClient &&
      conversation.customer_name &&
      reply
    ) {
      reply = [intro, copy.welcomeBack(conversation.customer_name), reply].join(
        '\n',
      );
    }

    return {
      reply,
      replyKind: 'conversation',
      conversationId: conversation.id,
      attachment,
    };
  }

  async recordOutgoingMessage(
    conversationId: string | null | undefined,
    organizationId: string,
    provider: BotProvider,
    reply: string,
  ): Promise<void> {
    if (!conversationId) {
      return;
    }

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, organization_id: organizationId },
    });

    if (!conversation) {
      return;
    }

    await this.logMessage(
      conversation,
      provider,
      BotMessageDirection.OUTGOING,
      reply,
    );
  }

  private async advanceConversation(
    conversation: BotConversation,
    messageText: string,
    intent: BotDetectedIntent,
    settings: BotSettings,
    copy: ConversationCopy,
    intro: string,
  ): Promise<string> {
    switch (conversation.current_step) {
      case BotConversationStep.MENU:
        return this.handleMenuSelection(conversation, messageText, copy);
      case BotConversationStep.CAPTURE_CLIENT_NAME:
        return this.captureClientName(
          conversation,
          messageText,
          settings,
          copy,
          intro,
        );
      case BotConversationStep.CAPTURE_CLIENT_EMAIL:
        return this.captureClientEmail(conversation, messageText, copy, intro);
      case BotConversationStep.CAPTURE_PRODUCT_QUERY:
        return this.captureProductQuery(conversation, messageText, copy);
      case BotConversationStep.SELECT_PRODUCT:
        return this.selectProduct(conversation, messageText, copy);
      case BotConversationStep.CAPTURE_QUANTITY:
        return this.captureQuantity(conversation, messageText, copy);
      case BotConversationStep.REVIEW:
        return this.reviewConversation(
          conversation,
          messageText,
          intent,
          settings,
          copy,
        );
      case BotConversationStep.CONSULT_PRICE:
        return this.consultPrice(conversation, messageText, copy);
      case BotConversationStep.CONSULT_STOCK:
        return this.consultStock(conversation, messageText, copy);
      default:
        return [
          intro,
          settings.welcome_message || copy.genericHelp,
          settings.handoff_message || copy.handoff,
        ].join('\n');
    }
  }

  private async handleMenuSelection(
    conversation: BotConversation,
    messageText: string,
    copy: ConversationCopy,
  ): Promise<string> {
    const normalized = this.normalize(messageText);
    const lowerMessage = messageText.toLowerCase().trim();

    // Check for exit/farewell commands first
    if (lowerMessage.includes('adios') || lowerMessage.includes('bye') ||
        lowerMessage.includes('chau') || lowerMessage.includes('fin') ||
        lowerMessage.includes('salir') || lowerMessage.includes('exit') ||
        lowerMessage.includes('再见') || lowerMessage.includes('拜拜')) {
      conversation.status = BotConversationStatus.COMPLETED;
      conversation.current_step = BotConversationStep.COMPLETED;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return copy.cancelled;
    }

    if (this.matchesMenuCommand(normalized, 'quote')) {
      if (conversation.customer_name) {
        conversation.current_step = BotConversationStep.CAPTURE_PRODUCT_QUERY;
        conversation.last_message_at = new Date();
        await this.conversationRepository.save(conversation);
        return copy.askProduct;
      } else {
        conversation.current_step = BotConversationStep.CAPTURE_CLIENT_NAME;
        conversation.last_message_at = new Date();
        await this.conversationRepository.save(conversation);
        return copy.askClientName;
      }
    }

    if (this.matchesMenuCommand(normalized, 'price')) {
      conversation.current_step = BotConversationStep.CONSULT_PRICE;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return copy.priceConsultIntro;
    }

    if (this.matchesMenuCommand(normalized, 'stock')) {
      conversation.current_step = BotConversationStep.CONSULT_STOCK;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return copy.stockConsultIntro;
    }

    if (this.matchesMenuCommand(normalized, 'agent')) {
      return await this.handoffConversation(conversation, {} as BotSettings, copy);
    }

    const selection = this.parseSelection(messageText);

    if (selection === null || selection < 1 || selection > 4) {
      return [copy.mainMenu, copy.askMenuChoice].join('\n');
    }

    if (selection === 1) {
      // Create quotation - proceed to customer name capture or product query if name known
      if (conversation.customer_name) {
        conversation.current_step = BotConversationStep.CAPTURE_PRODUCT_QUERY;
        conversation.last_message_at = new Date();
        await this.conversationRepository.save(conversation);
        return copy.askProduct;
      } else {
        conversation.current_step = BotConversationStep.CAPTURE_CLIENT_NAME;
        conversation.last_message_at = new Date();
        await this.conversationRepository.save(conversation);
        return copy.askClientName;
      }
    } else if (selection === 2) {
      // Check prices
      conversation.current_step = BotConversationStep.CONSULT_PRICE;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return copy.priceConsultIntro;
    } else if (selection === 3) {
      // Check stock/availability
      conversation.current_step = BotConversationStep.CONSULT_STOCK;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return copy.stockConsultIntro;
    } else if (selection === 4) {
      // Talk to agent
      return await this.handoffConversation(conversation, {} as BotSettings, copy);
    }

    return [copy.mainMenu, copy.askMenuChoice].join('\n');
  }

  private isGreetingMessage(messageText: string): boolean {
    return this.matchesAny(this.normalize(messageText), [
      'hola',
      'buenos',
      'buenas',
      'hello',
      'hi',
      'hey',
      'saludos',
      'qué tal',
      'qué onda',
      '你好',
      '您好',
      '喂',
    ]);
  }

  private isBackCommand(messageText: string): boolean {
    return this.matchesAny(this.normalize(messageText), [
      'menu',
      'menú',
      'volver',
      'regresar',
      'back',
      'atras',
      'inicio',
      'principal',
      '主菜单',
      '返回',
      '回到菜单',
    ]);
  }

  private extractNameFromGreeting(messageText: string): string | null {
    const lowerMessage = messageText.toLowerCase();
    let name: string | null = null;

    // Spanish patterns
    const soyMatch = lowerMessage.match(/soy\s+(.+)/i);
    if (soyMatch) {
      name = soyMatch[1].trim();
    }

    const meLlamoMatch = lowerMessage.match(/me\s+llamo\s+(.+)/i);
    if (meLlamoMatch) {
      name = meLlamoMatch[1].trim();
    }

    const miNombreMatch = lowerMessage.match(/mi\s+nombre\s+es\s+(.+)/i);
    if (miNombreMatch) {
      name = miNombreMatch[1].trim();
    }

    // English patterns
    const imMatch = lowerMessage.match(/i'?m\s+(.+)/i);
    if (imMatch) {
      name = imMatch[1].trim();
    }

    const myNameMatch = lowerMessage.match(/my\s+name\s+is\s+(.+)/i);
    if (myNameMatch) {
      name = myNameMatch[1].trim();
    }

    // Chinese patterns (basic)
    const woShiMatch = lowerMessage.match(/(我是|我叫)\s*(.+)/);
    if (woShiMatch) {
      name = woShiMatch[2].trim();
    }

    // Clean up the name - remove trailing punctuation and extra spaces
    if (name) {
      name = name.replace(/[.,!?;]+$/, '').trim();
      // If name is too long or looks like a sentence, discard
      if (name.length > 50 || name.includes('.') || name.split(' ').length > 4) {
        return null;
      }
    }

    return name;
  }

  private matchesMenuCommand(
    normalizedMessage: string,
    command: 'quote' | 'price' | 'stock' | 'agent',
  ): boolean {
    if (command === 'quote') {
      return this.matchesAny(normalizedMessage, [
        'cotizar',
        'cotizacion',
        'cotización',
        'quote',
        'quotation',
        'precio',
        'precios',
      ]);
    }

    if (command === 'price') {
      return this.matchesAny(normalizedMessage, [
        'precio',
        'precios',
        'price',
        'pricing',
        'tarifa',
      ]);
    }

    if (command === 'stock') {
      return this.matchesAny(normalizedMessage, [
        'stock',
        'existencia',
        'existencias',
        'disponibilidad',
        'available',
        'inventario',
        '库存',
      ]);
    }

    return this.matchesAny(normalizedMessage, [
      'asesor',
      'humano',
      'agente',
      'agent',
      'support',
      '客服',
    ]);
  }

  private async consultPrice(
    conversation: BotConversation,
    messageText: string,
    copy: ConversationCopy,
  ): Promise<string> {
    const products = await this.searchProducts(
      conversation.organization_id,
      messageText,
    );

    if (products.length === 0) {
      return copy.priceNotFound;
    }

    if (products.length === 1) {
      const product = products[0];
      conversation.current_step = BotConversationStep.MENU;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return [
        copy.priceResponse(product.name, product.price),
        '',
        copy.mainMenu,
        copy.askMenuChoice,
      ].join('\n');
    }

    // Multiple results - show list
    const context = this.ensureContext(conversation);
    context.selectedCandidates = products;
    conversation.current_step = BotConversationStep.MENU;
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    return [
      copy.multiplePriceMatches,
      ...products.map(
        (product, index) =>
          `${index + 1}. ${product.name} (${product.code}) - $${product.price.toFixed(2)}`,
      ),
      '',
      copy.mainMenu,
      copy.askMenuChoice,
    ].join('\n');
  }

  private async consultStock(
    conversation: BotConversation,
    messageText: string,
    copy: ConversationCopy,
  ): Promise<string> {
    const products = await this.searchProducts(
      conversation.organization_id,
      messageText,
    );

    if (products.length === 0) {
      return copy.stockNotFound;
    }

    if (products.length === 1) {
      const product = products[0];
      conversation.current_step = BotConversationStep.MENU;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return [
        copy.stockResponse(product.name, product.stock > 0),
        '',
        copy.mainMenu,
        copy.askMenuChoice,
      ].join('\n');
    }

    conversation.current_step = BotConversationStep.MENU;
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    return [
      copy.multipleStockMatches,
      ...products.map((product, index) =>
        `${index + 1}. ${product.name} (${product.code}) - $${product.price.toFixed(2)} | ${product.stock > 0 ? copy.stockAvailableLabel : copy.stockUnavailableLabel}`,
      ),
      '',
      copy.mainMenu,
      copy.askMenuChoice,
    ].join('\n');
  }

  private async captureClientName(
    conversation: BotConversation,
    messageText: string,
    _settings: BotSettings,
    copy: ConversationCopy,
    intro: string,
  ): Promise<string> {
    const name = messageText.trim().replace(/\s+/g, ' ');

    if (name.length < 3) {
      return copy.invalidClientName;
    }

    const client = await this.ensureClient(
      conversation.organization_id,
      name,
      conversation.customer_phone,
    );
    const context = this.ensureContext(conversation);
    context.clientName = client.name;

    conversation.client_id = client.id;
    conversation.customer_name = client.name;
    conversation.context_json = context;
    conversation.current_step = BotConversationStep.CAPTURE_CLIENT_EMAIL;
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    return [
      copy.clientRegistered(client.name),
      copy.askClientEmail,
    ].join('\n');
  }

  private async captureClientEmail(
    conversation: BotConversation,
    messageText: string,
    copy: ConversationCopy,
    intro: string,
  ): Promise<string> {
    const value = messageText.trim();
    const context = this.ensureContext(conversation);

    if (this.isSkipKeyword(value)) {
      conversation.current_step = BotConversationStep.CAPTURE_PRODUCT_QUERY;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);

      if (context.pendingProductQuery) {
        const followUp = await this.captureProductQuery(
          conversation,
          context.pendingProductQuery,
          copy,
        );
        return [copy.emailSkipped, followUp].join('\n');
      }

      return [copy.emailSkipped, copy.askProduct].join('\n');
    }

    if (!this.isValidEmail(value)) {
      return copy.invalidEmail;
    }

    await this.updateClientEmail(conversation.client_id, value);
    conversation.current_step = BotConversationStep.CAPTURE_PRODUCT_QUERY;
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    if (context.pendingProductQuery) {
      const followUp = await this.captureProductQuery(
        conversation,
        context.pendingProductQuery,
        copy,
      );
      return [copy.emailRegistered(value), followUp].join('\n');
    }

    return [copy.emailRegistered(value), copy.askProduct].join('\n');
  }

  private async captureProductQuery(
    conversation: BotConversation,
    messageText: string,
    copy: ConversationCopy,
  ): Promise<string> {
    const query = messageText.trim();
    const isProductQuery = this.looksLikeProductQuery(query);
    const products = await this.searchProducts(
      conversation.organization_id,
      query,
    );
    const context = this.ensureContext(conversation);
    if (isProductQuery) {
      context.pendingProductQuery = query;
    }

    if (products.length === 0) {
      conversation.context_json = context;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      if (this.isGreetingOrSmallTalk(query) || !isProductQuery) {
        return copy.askProduct;
      }
      return copy.noProductsFound;
    }

    if (products.length === 1) {
      context.selectedCandidates = null;
      context.selectedProduct = products[0];
      conversation.context_json = context;
      conversation.current_step = BotConversationStep.CAPTURE_QUANTITY;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return this.buildSelectedProductReply(products[0], copy);
    }

    context.selectedCandidates = products;
    context.selectedProduct = null;
    conversation.context_json = context;
    conversation.current_step = BotConversationStep.SELECT_PRODUCT;
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    return [
      copy.selectProduct,
      ...products.map(
        (product, index) =>
          `${index + 1}. ${product.name} (${product.code}) - $${product.price.toFixed(2)}`,
      ),
    ].join('\n');
  }

  private async selectProduct(
    conversation: BotConversation,
    messageText: string,
    copy: ConversationCopy,
  ): Promise<string> {
    const context = this.ensureContext(conversation);
    const candidates = context.selectedCandidates ?? [];
    const selection = this.parseSelection(messageText);

    if (!selection) {
      if (this.looksLikeProductQuery(messageText)) {
        return this.captureProductQuery(conversation, messageText, copy);
      }
      return copy.invalidSelection;
    }

    if (selection < 1 || selection > candidates.length) {
      return copy.invalidSelection;
    }

    const selectedProduct = candidates[selection - 1];

    // Handle price consultation mode
    if (context.consultMode === 'price') {
      conversation.current_step = BotConversationStep.MENU;
      conversation.context_json = context;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return [
        copy.priceResponse(selectedProduct.name, selectedProduct.price),
        '',
        copy.mainMenu,
        copy.askMenuChoice,
      ].join('\n');
    }

    // Handle stock consultation mode
    if (context.consultMode === 'stock') {
      conversation.current_step = BotConversationStep.MENU;
      conversation.context_json = context;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return [
        copy.stockResponse(selectedProduct.name, selectedProduct.stock > 0),
        '',
        copy.mainMenu,
        copy.askMenuChoice,
      ].join('\n');
    }

    // Normal quotation mode
    context.selectedProduct = selectedProduct;
    context.selectedCandidates = null;
    context.consultMode = null;
    conversation.context_json = context;
    conversation.current_step = BotConversationStep.CAPTURE_QUANTITY;
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    return this.buildSelectedProductReply(selectedProduct, copy);
  }

  private async captureQuantity(
    conversation: BotConversation,
    messageText: string,
    copy: ConversationCopy,
  ): Promise<string> {
    const quantity = this.parseQuantity(messageText);
    const context = this.ensureContext(conversation);
    const selectedProduct = context.selectedProduct;

    if (!selectedProduct) {
      conversation.current_step = BotConversationStep.CAPTURE_PRODUCT_QUERY;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return copy.askProduct;
    }

    if (!quantity || quantity <= 0) {
      return copy.invalidQuantity;
    }

    // Always add as new item, even if product already exists
    context.items.push({
      productId: selectedProduct.id,
      name: selectedProduct.name,
      code: selectedProduct.code,
      sku: selectedProduct.sku,
      quantity,
      price: selectedProduct.price,
      stock: selectedProduct.stock,
      tax: selectedProduct.tax,
    });

    context.selectedProduct = null;
    context.selectedCandidates = null;
    context.pendingProductQuery = null;

    conversation.context_json = context;
    conversation.current_step = BotConversationStep.REVIEW;
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    return this.buildReviewMessage(context.items, copy);
  }

  private async reviewConversation(
    conversation: BotConversation,
    messageText: string,
    intent: BotDetectedIntent,
    settings: BotSettings,
    copy: ConversationCopy,
  ): Promise<string> {
    const context = this.ensureContext(conversation);
    const normalized = this.normalize(messageText);
    const selection = this.parseSelection(messageText);

    if (selection === 1) {
      conversation.current_step = BotConversationStep.CAPTURE_PRODUCT_QUERY;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return copy.addMoreAcknowledgement;
    }

    if (selection === 2 || intent.type === 'affirm') {
      return this.createFormalQuotation(conversation, settings, copy);
    }

    if (selection === 3) {
      conversation.current_step = BotConversationStep.MENU;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return [copy.mainMenu, copy.askMenuChoice].join('\n');
    }

    if (selection === 4) {
      return this.handoffConversation(conversation, settings, copy);
    }

    if (this.looksLikeProductQuery(normalized)) {
      conversation.current_step = BotConversationStep.CAPTURE_PRODUCT_QUERY;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return this.captureProductQuery(conversation, messageText, copy);
    }

    return [
      this.buildDraftSummary(context.items, copy),
      copy.askReviewChoice,
    ].join('\n');
  }

  private async startConversation(params: {
    organizationId: string;
    provider: BotProvider;
    remoteJid: string;
    customerPhone: string;
    incomingText: string;
  }): Promise<BotConversation> {
    const existingClient = await this.findClientByPhone(
      params.organizationId,
      params.customerPhone,
    );
    const pendingProductQuery = this.extractLikelyProductQuery(
      params.incomingText,
    );

    let extractedName = existingClient?.name ?? null;
    if (!existingClient && this.isGreetingMessage(params.incomingText)) {
      extractedName = this.extractNameFromGreeting(params.incomingText);
    }

    const conversation = this.conversationRepository.create({
      organization_id: params.organizationId,
      provider: params.provider,
      channel: 'whatsapp',
      customer_phone: params.customerPhone,
      customer_jid: params.remoteJid,
      customer_name: extractedName,
      client_id: existingClient?.id ?? null,
      status: BotConversationStatus.ACTIVE,
      current_step: BotConversationStep.MENU,
      context_json: {
        clientName: extractedName,
        pendingProductQuery,
        selectedCandidates: null,
        selectedProduct: null,
        items: [],
      },
      last_message_at: new Date(),
    });

    return this.conversationRepository.save(conversation);
  }

  private async cancelConversation(
    conversation: BotConversation,
    copy: ConversationCopy,
  ): Promise<string> {
    conversation.status = BotConversationStatus.CANCELLED;
    conversation.current_step = BotConversationStep.COMPLETED;
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    return copy.cancelled;
  }

  private async buildHandoffReply(
    organizationId: string,
    settings: BotSettings,
    copy: ConversationCopy,
  ): Promise<string> {
    const companySettings = await this.companySettingsRepository.findOne({
      where: { organization_id: organizationId },
    });

    const contactInfo: string[] = [];
    if (companySettings?.phone) {
      contactInfo.push(`Teléfono: ${companySettings.phone}`);
    }
    if (companySettings?.email) {
      contactInfo.push(`Correo: ${companySettings.email}`);
    }
    if (companySettings?.address) {
      contactInfo.push(`Dirección: ${companySettings.address}`);
    }

    const baseMessage = settings.handoff_message || copy.handoff;
    const fullMessage = contactInfo.length > 0
      ? `${baseMessage}\n\nInformación de contacto:\n${contactInfo.join('\n')}`
      : baseMessage;

    return fullMessage;
  }

  private matchesAny(normalizedMessage: string, keywords: string[]): boolean {
    return keywords.some((keyword) => normalizedMessage.includes(this.normalize(keyword)));
  }

  private async handoffConversation(
    conversation: BotConversation,
    settings: BotSettings,
    copy: ConversationCopy,
  ): Promise<string> {
    conversation.status = BotConversationStatus.HANDOFF;
    conversation.current_step = BotConversationStep.COMPLETED;
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    return this.buildHandoffReply(conversation.organization_id, settings, copy);
  }

  private async createFormalQuotation(
    conversation: BotConversation,
    settings: BotSettings,
    copy: ConversationCopy,
  ): Promise<string> {
    const context = this.ensureContext(conversation);

    if (!conversation.client_id || context.items.length === 0) {
      conversation.current_step = BotConversationStep.CAPTURE_PRODUCT_QUERY;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);
      return copy.askProduct;
    }

    try {
      const quotation = await this.tenantContext.run(
        {
          organizationId: conversation.organization_id,
          tenantSlug: null,
          locale: settings.default_language,
        },
        async () => {
          const nextCode = await this.surrogateService.getNextCode('quotation');
          const createQuotationDto: CreateQuotationDto = {
            code: nextCode.next_code,
            date: this.formatDate(new Date()),
            valid_until: this.formatDate(this.addDays(new Date(), 7)),
            client_id: conversation.client_id as string,
            notes:
              'Cotización creada automáticamente desde el bot de WhatsApp.',
          };

          const createdQuotation =
            await this.quotationService.create(createQuotationDto);

          for (const item of context.items) {
            const detailDto: CreateQuotationDetailDto = {
              product_id: item.productId,
              quantity: item.quantity,
              price: item.price,
            };
            await this.quotationService.createDetail(
              createdQuotation.id,
              detailDto,
            );
          }

          return this.quotationService.findOne(createdQuotation.id);
        },
      );

      conversation.status = BotConversationStatus.COMPLETED;
      conversation.current_step = BotConversationStep.COMPLETED;
      conversation.quotation_id = quotation.id;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);

      return [
        copy.quoteCreated(quotation.code, Number(quotation.total)),
        this.buildDraftSummary(context.items, copy),
        copy.quoteCreatedNextStep,
      ].join('\n');
    } catch (error) {
      this.logger.warn(
        `Unable to create formal quotation for conversation ${conversation.id}: ${String(error)}`,
      );

      conversation.current_step = BotConversationStep.REVIEW;
      conversation.last_message_at = new Date();
      await this.conversationRepository.save(conversation);

      return copy.quoteFailed;
    }
  }

  private async getActiveConversation(
    organizationId: string,
    provider: BotProvider,
    customerPhone: string,
  ): Promise<BotConversation | null> {
    return this.conversationRepository.findOne({
      where: {
        organization_id: organizationId,
        provider,
        customer_phone: customerPhone,
        status: In([BotConversationStatus.ACTIVE, BotConversationStatus.HANDOFF]),
      },
      order: {
        updated_at: 'DESC',
      },
    });
  }

  private async handlePossiblyExpiredConversation(
    conversation: BotConversation,
  ): Promise<BotConversation | null> {
    const lastMessageTime =
      conversation.last_message_at ?? conversation.updated_at;
    if (Date.now() - lastMessageTime.getTime() < 24 * 60 * 60 * 1000) {
      return conversation;
    }

    conversation.status = BotConversationStatus.EXPIRED;
    conversation.current_step = BotConversationStep.COMPLETED;
    await this.conversationRepository.save(conversation);
    return null;
  }

  private async findClientByPhone(
    organizationId: string,
    customerPhone: string,
  ): Promise<Client | null> {
    const tail = customerPhone.slice(-6);

    const candidates = await this.clientRepository.find({
      where: {
        organization_id: organizationId,
        phone: Not(IsNull()),
      },
      take: 25,
      order: { updated_at: 'DESC' },
    });

    return (
      candidates.find((client) => {
        const normalizedPhone = this.normalizePhone(client.phone || '');
        return (
          normalizedPhone === customerPhone || normalizedPhone.endsWith(tail)
        );
      }) ?? null
    );
  }

  private async ensureClient(
    organizationId: string,
    customerName: string,
    customerPhone: string,
  ): Promise<Client> {
    const existing = await this.findClientByPhone(
      organizationId,
      customerPhone,
    );
    if (existing) {
      return existing;
    }

    const codeResponse = await this.tenantContext.run(
      {
        organizationId,
        tenantSlug: null,
      },
      async () => this.surrogateService.getNextCode('client'),
    );

    const client = this.clientRepository.create({
      organization_id: organizationId,
      code: codeResponse.next_code,
      name: customerName,
      description: 'Cliente creado automáticamente desde el bot de WhatsApp.',
      phone: customerPhone,
      status: true,
    });

    const savedClient = await this.clientRepository.save(client);

    await this.tenantContext.run(
      {
        organizationId,
        tenantSlug: null,
      },
      async () =>
        this.surrogateService.useCodeIfMatches('client', savedClient.code),
    );

    return savedClient;
  }

  private async updateClientEmail(
    clientId: string | null,
    email: string,
  ): Promise<void> {
    if (!clientId) {
      return;
    }

    const client = await this.clientRepository.findOne({
      where: { id: clientId },
    });

    if (!client) {
      return;
    }

    client.email = email.trim().toLowerCase();
    await this.clientRepository.save(client);
  }

  private async prepareQuotationDelivery(
    conversation: BotConversation,
    settings: BotSettings,
    copy: ConversationCopy,
  ): Promise<{
    attachment: ProcessIncomingBotMessageResult['attachment'];
    message: string | null;
  }> {
    if (!conversation.quotation_id) {
      return { attachment: null, message: null };
    }

    try {
      const document = await this.quotationBotPdfService.generate(
        conversation.organization_id,
        conversation.quotation_id,
        settings.default_language,
      );

      const client = conversation.client_id
        ? await this.clientRepository.findOne({
            where: { id: conversation.client_id },
          })
        : null;

      const messageLines = [copy.quotePdfAttached];

      if (client?.email) {
        const emailResult = await this.emailService.sendOrganizationEmail(
          conversation.organization_id,
          {
            to: client.email,
            subject: `Cotizacion ${document.fileName.replace('.pdf', '')}`,
            html: `
              <p>Hola ${client.name || ''},</p>
              <p>Adjuntamos la cotizacion generada desde WhatsApp.</p>
              <p>Si necesitas ajustes o quieres agregar mas productos, responde a este mensaje o solicita un asesor.</p>
            `,
            attachments: [
              {
                filename: document.fileName,
                content: document.buffer,
                contentType: 'application/pdf',
              },
            ],
          },
        );

        if (emailResult.configured) {
          messageLines.push(
            emailResult.sent
              ? copy.quoteEmailSent(client.email)
              : copy.quoteEmailFailed,
          );
        }
      }

      return {
        attachment: {
          buffer: document.buffer,
          fileName: document.fileName,
          mimetype: 'application/pdf',
        },
        message: messageLines.join('\n'),
      };
    } catch (error) {
      this.logger.warn(
        `Unable to prepare quotation delivery for conversation ${conversation.id}: ${String(error)}`,
      );
      return {
        attachment: null,
        message: null,
      };
    }
  }

  private async searchProducts(
    organizationId: string,
    incomingText: string,
  ): Promise<BotConversationCandidateProduct[]> {
    const tokens = this.extractSearchTokens(incomingText).slice(0, 4);
    if (tokens.length === 0) {
      return [];
    }

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.prices', 'price', 'price.deleted_at IS NULL')
      .leftJoinAndSelect('product.tax', 'legacyTax')
      .leftJoinAndSelect('product.productTaxes', 'productTax')
      .leftJoinAndSelect('productTax.tax', 'taxEntity')
      .where('product.organization_id = :organizationId', { organizationId })
      .andWhere('product.deleted_at IS NULL')
      .andWhere('product.is_active = :isActive', { isActive: true })
      .andWhere(
        new Brackets((qb) => {
          tokens.forEach((token, index) => {
            const key = `token${index}`;
            qb.orWhere(`LOWER(product.name) LIKE :${key}`, {
              [key]: `%${token}%`,
            })
              .orWhere(`LOWER(product.code) LIKE :${key}`, {
                [key]: `%${token}%`,
              })
              .orWhere(`LOWER(product.sku) LIKE :${key}`, {
                [key]: `%${token}%`,
              });
          });
        }),
      )
      .take(5)
      .getMany();

    return products.map((product) => {
      const taxRate = product.productTaxes?.length
        ? product.productTaxes.reduce((sum, pt) => sum + Number(pt.tax?.value || 0), 0)
        : (product.tax ? Number(product.tax.value) : 0);
      return {
        id: product.id,
        name: product.name,
        code: product.code,
        sku: product.sku,
        price: Number(product.prices?.[0]?.price ?? product.base_price ?? 0),
        stock: Number(product.total_stock ?? 0),
        tax: taxRate > 0 ? taxRate : null,
      };
    });
  }

  private async getCompanyName(
    organizationId: string,
    settings: BotSettings,
  ): Promise<string> {
    const companySettings = await this.companySettingsRepository.findOne({
      where: { organization_id: organizationId },
    });

    return (
      companySettings?.name ||
      companySettings?.legalName ||
      this.getCopy(settings.default_language).companyFallback
    );
  }

  private getCopy(language?: string | null): ConversationCopy {
    const normalized = (language || 'es').split('-')[0].toLowerCase();
    if (normalized === 'en' || normalized === 'zh') {
      return CONVERSATION_COPY[normalized];
    }

    return CONVERSATION_COPY.es;
  }

  private ensureContext(conversation: BotConversation): BotConversationContext {
    if (!conversation.context_json) {
      conversation.context_json = {
        clientName: conversation.customer_name,
        pendingProductQuery: null,
        selectedCandidates: null,
        selectedProduct: null,
        items: [],
      };
    }

    if (!conversation.context_json.items) {
      conversation.context_json.items = [];
    }

    return conversation.context_json;
  }

  private buildSelectedProductReply(
    product: BotConversationCandidateProduct,
    copy: ConversationCopy,
  ): string {
    return [
      `${product.name} (${product.code}) - $${product.price.toFixed(2)}`,
      copy.askQuantity(product.name),
    ].join('\n');
  }

  private buildReviewMessage(
    items: BotConversationDraftItem[],
    copy: ConversationCopy,
  ): string {
    return [
      this.buildDraftSummary(items, copy),
      ...copy.reviewOptions,
      copy.askReviewChoice,
    ].join('\n');
  }

  private buildDraftSummary(
    items: BotConversationDraftItem[],
    copy: ConversationCopy,
  ): string {
    let subtotal = 0;
    let totalTax = 0;

    const lines = items.map((item, index) => {
      const lineSubtotal = Number(item.quantity) * Number(item.price);
      const taxAmount = item.tax ? (lineSubtotal * item.tax) / 100 : 0;
      const lineTotal = lineSubtotal + taxAmount;
      subtotal += lineSubtotal;
      totalTax += taxAmount;

      return `${index + 1}. ${item.name} (${item.code}) | ${copy.quantityLabel}: ${Number(item.quantity).toFixed(2)} | $${Number(item.price).toFixed(2)} | ${copy.subtotal}: $${lineSubtotal.toFixed(2)}${item.tax ? ` | ${copy.tax}: $${taxAmount.toFixed(2)}` : ''} | ${copy.totalLabel}: $${lineTotal.toFixed(2)}`;
    });

    const total = subtotal + totalTax;

    return [
      copy.reviewHeader,
      ...lines,
      `${copy.subtotal}: $${subtotal.toFixed(2)}`,
      totalTax > 0 ? `${copy.tax}: $${totalTax.toFixed(2)}` : null,
      `${copy.totalLabel}: $${total.toFixed(2)}`,
    ].filter(Boolean).join('\n');
  }

  private async logMessage(
    conversation: BotConversation,
    provider: BotProvider,
    direction: BotMessageDirection,
    messageText: string,
    intent?: BotDetectedIntent,
  ): Promise<void> {
    const payload = this.messageRepository.create({
      organization_id: conversation.organization_id,
      conversation_id: conversation.id,
      provider,
      direction,
      message_text: messageText,
      detected_intent: intent?.type ?? null,
      metadata: intent
        ? {
            confidence: intent.confidence ?? null,
            entities: intent.entities ?? [],
          }
        : null,
    });

    await this.messageRepository.save(payload);
  }

  private parseSelection(messageText: string): number | null {
    const match = messageText.trim().match(/\d+/);
    if (!match) {
      return null;
    }

    const value = Number.parseInt(match[0], 10);
    return Number.isFinite(value) ? value : null;
  }

  private parseQuantity(messageText: string): number | null {
    const match = messageText.trim().match(/\d+(?:[.,]\d+)?/);
    if (!match) {
      return null;
    }

    const value = Number.parseFloat(match[0].replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }

    return value;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private extractCustomerPhone(remoteJid: string): string {
    const raw = remoteJid.split('@')[0] || remoteJid;
    return this.normalizePhone(raw);
  }

  private extractLikelyProductQuery(messageText: string): string | null {
    const trimmed = messageText.trim();
    if (!trimmed) {
      return null;
    }

    return this.extractSearchTokens(trimmed).length > 0 ? trimmed : null;
  }

  private extractSearchTokens(messageText: string): string[] {
    return this.normalize(messageText)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .filter((token) => !this.isNoiseToken(token));
  }

  private looksLikeProductQuery(messageText: string): boolean {
    return this.extractSearchTokens(messageText).length > 0;
  }

  private isGreetingOrSmallTalk(messageText: string): boolean {
    const normalized = this.normalize(messageText);
    return [
      'hola',
      'buenos dias',
      'buenos días',
      'buenas tardes',
      'buenas noches',
      'buen dia',
      'buen día',
      'buenas',
      'hi',
      'hello',
      'hey',
      'gracias',
      'ok',
      'vale',
      'bien',
      'adios',
      'chau',
      'hasta luego',
      'nos vemos',
      'bye',
    ].some((phrase) => normalized === phrase || normalized.includes(phrase));
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  private isSkipKeyword(value: string): boolean {
    return ['omitir', 'skip', 'saltar', 'pasar', '跳过'].includes(
      this.normalize(value),
    );
  }

  private isNoiseToken(token: string): boolean {
    return [
      'hola',
      'buenas',
      'buenos',
      'dias',
      'tardes',
      'noches',
      'quiero',
      'necesito',
      'busco',
      'una',
      'uno',
      'unos',
      'unas',
      'el',
      'la',
      'los',
      'las',
      'de',
      'del',
      'con',
      'por',
      'para',
      'favor',
      'cotizacion',
      'cotizar',
      'precio',
      'precios',
      'stock',
      'disponibilidad',
      'si',
      'yes',
      'ok',
      'okay',
      'quote',
      'quotation',
      'price',
      'pricing',
      'inventory',
      'availability',
      'please',
      'pls',
      '报价',
      '价格',
      '库存',
      '你好',
      '需要',
      '请',
    ].includes(token);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }
}
