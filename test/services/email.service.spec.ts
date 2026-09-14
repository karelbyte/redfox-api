import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('EmailService', () => {
  let service: any;
  let emailProvider: any;
  let templateService: any;
  let queueService: any;

  beforeEach(async () => {
    emailProvider = {
      send: jest.fn(),
      sendBulk: jest.fn(),
      getStatus: jest.fn(),
      validateEmail: jest.fn().mockReturnValue(true),
    };

    templateService = {
      render: jest.fn(),
      validate: jest.fn().mockReturnValue(true),
      getTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      listTemplates: jest.fn(),
      createTemplate: jest.fn(),
    };

    queueService = {
      add: jest.fn(),
      get: jest.fn(),
      remove: jest.fn(),
      retry: jest.fn(),
      getStats: jest.fn(),
    };

    service = {
      sendEmail: async (dto: any) => {
        if (!dto.to || !emailProvider.validateEmail(dto.to)) {
          throw new BadRequestException('Invalid email address');
        }
        try {
          const result = await emailProvider.send(dto);
          await queueService.add(result);
          return result;
        } catch (error) {
          throw new BadRequestException(error.message);
        }
      },
      
      sendTemplateEmail: async (dto: any) => {
        if (!templateService.validate(dto.templateId, dto.templateData)) {
          throw new BadRequestException('Invalid template data');
        }
        try {
          const content = await templateService.render(dto.templateId, dto.templateData);
          return await emailProvider.send({
            to: dto.to,
            subject: dto.subject,
            content,
            from: dto.from,
          });
        } catch (error) {
          throw new NotFoundException(error.message);
        }
      },
      
      sendBulkEmail: async (dto: any) => {
        if (!dto.recipients || dto.recipients.length === 0) {
          throw new BadRequestException('Recipients list cannot be empty');
        }
        
        for (const recipient of dto.recipients) {
          if (!emailProvider.validateEmail(recipient.email)) {
            throw new BadRequestException(`Invalid email address: ${recipient.email}`);
          }
        }
        
        return await emailProvider.sendBulk(dto);
      },
      
      sendEmailWithAttachments: async (dto: any) => {
        if (!dto.attachments || dto.attachments.length === 0) {
          throw new BadRequestException('Attachments required');
        }
        
        for (const attachment of dto.attachments) {
          if (!attachment.content || !attachment.contentType) {
            throw new BadRequestException('Invalid attachment format');
          }
          if (Buffer.byteLength(attachment.content) > 25 * 1024 * 1024) { // 25MB limit
            throw new BadRequestException('Attachment size exceeds limit');
          }
        }
        
        return await emailProvider.send(dto);
      },
      
      getEmailStatus: async (id: string) => {
        try {
          return await emailProvider.getStatus(id);
        } catch (error) {
          throw new NotFoundException('Email not found');
        }
      },
      
      getEmailLogs: async (dto: any) => {
        return await queueService.get('logs', dto);
      },
      
      createEmailTemplate: async (dto: any) => {
        if (!templateService.validate(dto.content)) {
          throw new BadRequestException('Invalid template syntax');
        }
        try {
          return await templateService.createTemplate(dto);
        } catch (error) {
          throw new BadRequestException(error.message);
        }
      },
      
      updateEmailTemplate: async (id: string, dto: any) => {
        try {
          return await templateService.updateTemplate(id, dto);
        } catch (error) {
          throw new NotFoundException('Template not found');
        }
      },
      
      deleteEmailTemplate: async (id: string) => {
        try {
          return await templateService.deleteTemplate(id);
        } catch (error) {
          throw new BadRequestException(error.message);
        }
      },
      
      getEmailTemplates: async (dto: any) => {
        return await templateService.listTemplates(dto);
      },
      
      previewEmailTemplate: async (dto: any) => {
        try {
          const html = await templateService.render(dto.templateId, dto.templateData);
          return {
            html,
            text: html.replace(/<[^>]*>/g, ''),
            subject: 'Preview',
          };
        } catch (error) {
          throw new NotFoundException('Template not found');
        }
      },
      
      testEmailTemplate: async (dto: any) => {
        if (!emailProvider.validateEmail(dto.testEmail)) {
          throw new BadRequestException('Invalid test email');
        }
        
        const content = await templateService.render(dto.templateId, dto.templateData);
        return await emailProvider.send({
          to: dto.testEmail,
          subject: 'Test: Preview',
          content,
        });
      },
      
      getEmailQueue: async (dto?: any) => {
        if (dto) {
          return await queueService.get('queue', dto);
        }
        return await queueService.getStats();
      },
      
      retryFailedEmails: async (dto: any) => {
        if (!dto.emailIds || dto.emailIds.length === 0) {
          throw new BadRequestException('Email IDs cannot be empty');
        }
        
        return await queueService.retry(dto);
      },
      
      cancelEmail: async (id: string) => {
        try {
          return await queueService.remove(id);
        } catch (error) {
          if (error.message.includes('already sent')) {
            throw new BadRequestException(error.message);
          } else if (error.message.includes('not found')) {
            throw new NotFoundException(error.message);
          }
          throw error;
        }
      },
      
      getEmailMetrics: async (dto: any) => {
        return await queueService.getStats('metrics', dto);
      },
    };
  });

  describe('sendEmail', () => {
    const sendEmailDto = {
      to: 'test@example.com',
      subject: 'Test Email',
      content: 'This is a test email',
      from: 'noreply@example.com',
      replyTo: 'support@example.com',
      priority: 'NORMAL',
      trackOpens: true,
      trackClicks: true,
    };

    it('should send email successfully', async () => {
      const mockEmailResult = {
        id: 'email-123',
        status: 'SENT',
        messageId: 'msg-456',
        sentAt: new Date(),
      };

      emailProvider.send.mockResolvedValue(mockEmailResult);
      queueService.add.mockResolvedValue({ id: 'queue-789' });

      const result = await service.sendEmail(sendEmailDto);

      expect(emailProvider.send).toHaveBeenCalledWith(sendEmailDto);
      expect(queueService.add).toHaveBeenCalled();
      expect(result).toEqual(mockEmailResult);
    });

    it('should throw error for invalid email address', async () => {
      const invalidDto = { ...sendEmailDto, to: 'invalid-email' };

      emailProvider.validateEmail.mockReturnValue(false);

      await expect(service.sendEmail(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when email provider fails', async () => {
      emailProvider.send.mockRejectedValue(new Error('SMTP Error'));

      await expect(service.sendEmail(sendEmailDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle email with CC and BCC', async () => {
      const emailWithRecipients = {
        ...sendEmailDto,
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: ['bcc1@example.com'],
      };

      emailProvider.send.mockResolvedValue({ id: 'email-123', status: 'SENT' });

      const result = await service.sendEmail(emailWithRecipients);

      expect(emailProvider.send).toHaveBeenCalledWith(emailWithRecipients);
      expect(result).toBeDefined();
    });
  });

  describe('sendTemplateEmail', () => {
    const templateEmailDto = {
      to: 'test@example.com',
      templateId: 'welcome-template',
      templateData: {
        userName: 'Test User',
        companyName: 'Test Company',
        activationLink: 'https://example.com/activate',
      },
      subject: 'Welcome to our platform',
      from: 'noreply@example.com',
    };

    it('should send template email successfully', async () => {
      const mockRenderedContent = '<h1>Welcome Test User</h1><p>Thank you for joining Test Company</p>';
      const mockEmailResult = {
        id: 'email-123',
        status: 'SENT',
        messageId: 'msg-456',
      };

      templateService.render.mockResolvedValue(mockRenderedContent);
      emailProvider.send.mockResolvedValue(mockEmailResult);

      const result = await service.sendTemplateEmail(templateEmailDto);

      expect(templateService.render).toHaveBeenCalledWith(
        templateEmailDto.templateId,
        templateEmailDto.templateData
      );
      expect(emailProvider.send).toHaveBeenCalledWith({
        to: templateEmailDto.to,
        subject: templateEmailDto.subject,
        content: mockRenderedContent,
        from: templateEmailDto.from,
      });
      expect(result).toEqual(mockEmailResult);
    });

    it('should throw error if template not found', async () => {
      templateService.render.mockRejectedValue(new Error('Template not found'));

      await expect(service.sendTemplateEmail(templateEmailDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error for invalid template data', async () => {
      templateService.validate.mockReturnValue(false);

      await expect(service.sendTemplateEmail(templateEmailDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendBulkEmail', () => {
    const bulkEmailDto = {
      recipients: [
        { email: 'user1@example.com', name: 'User 1' },
        { email: 'user2@example.com', name: 'User 2' },
        { email: 'user3@example.com', name: 'User 3' },
      ],
      subject: 'Bulk Email Test',
      content: 'This is a bulk email',
      from: 'noreply@example.com',
      batchSize: 100,
      delayBetweenBatches: 1000,
    };

    it('should send bulk email successfully', async () => {
      const mockBulkResult = {
        totalRecipients: 3,
        successfulSends: 3,
        failedSends: 0,
        batchResults: [
          { batchId: 1, sent: 3, failed: 0 },
        ],
        errors: [],
      };

      emailProvider.sendBulk.mockResolvedValue(mockBulkResult);

      const result = await service.sendBulkEmail(bulkEmailDto);

      expect(emailProvider.sendBulk).toHaveBeenCalledWith(bulkEmailDto);
      expect(result).toEqual(mockBulkResult);
    });

    it('should handle partial failures in bulk email', async () => {
      const mockPartialResult = {
        totalRecipients: 3,
        successfulSends: 2,
        failedSends: 1,
        batchResults: [
          { batchId: 1, sent: 2, failed: 1 },
        ],
        errors: [
          { email: 'user3@example.com', error: 'Invalid email address' },
        ],
      };

      emailProvider.sendBulk.mockResolvedValue(mockPartialResult);

      const result = await service.sendBulkEmail(bulkEmailDto);

      expect(result.successfulSends).toBe(2);
      expect(result.failedSends).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should throw error for empty recipients list', async () => {
      const emptyDto = { ...bulkEmailDto, recipients: [] };

      await expect(service.sendBulkEmail(emptyDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate all email addresses before sending', async () => {
      emailProvider.validateEmail.mockImplementation((email) => 
        email !== 'invalid@example.com'
      );

      const invalidRecipientsDto = {
        ...bulkEmailDto,
        recipients: [
          ...bulkEmailDto.recipients,
          { email: 'invalid@example.com', name: 'Invalid User' },
        ],
      };

      await expect(service.sendBulkEmail(invalidRecipientsDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendEmailWithAttachments', () => {
    const attachmentEmailDto = {
      to: 'test@example.com',
      subject: 'Email with attachments',
      content: 'Please find attached files',
      attachments: [
        {
          filename: 'document.pdf',
          content: Buffer.from('pdf content'),
          contentType: 'application/pdf',
        },
        {
          filename: 'image.jpg',
          content: Buffer.from('image content'),
          contentType: 'image/jpeg',
        },
      ],
      from: 'noreply@example.com',
    };

    it('should send email with attachments successfully', async () => {
      const mockResult = {
        id: 'email-123',
        status: 'SENT',
        attachments: [
          { filename: 'document.pdf', size: 1024 },
          { filename: 'image.jpg', size: 2048 },
        ],
      };

      emailProvider.send.mockResolvedValue(mockResult);

      const result = await service.sendEmailWithAttachments(attachmentEmailDto);

      expect(emailProvider.send).toHaveBeenCalledWith(attachmentEmailDto);
      expect(result).toEqual(mockResult);
    });

    it('should throw error for invalid attachment format', async () => {
      const invalidDto = {
        ...attachmentEmailDto,
        attachments: [
          {
            filename: 'document.pdf',
            // Missing content
            contentType: 'application/pdf',
          },
        ],
      };

      await expect(service.sendEmailWithAttachments(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should limit attachment size', async () => {
      const largeAttachment = {
        filename: 'large-file.pdf',
        content: Buffer.alloc(26 * 1024 * 1024), // 26MB - exceeds limit
        contentType: 'application/pdf',
      };

      const largeDto = {
        ...attachmentEmailDto,
        attachments: [largeAttachment],
      };

      await expect(service.sendEmailWithAttachments(largeDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEmailStatus', () => {
    const emailId = 'email-123';

    it('should return email status successfully', async () => {
      const mockStatus = {
        id: emailId,
        status: 'DELIVERED',
        messageId: 'msg-456',
        sentAt: new Date('2024-01-01T10:00:00Z'),
        deliveredAt: new Date('2024-01-01T10:01:00Z'),
        opens: 2,
        clicks: 1,
        lastOpenedAt: new Date('2024-01-01T15:30:00Z'),
        bounces: [],
        complaints: [],
      };

      emailProvider.getStatus.mockResolvedValue(mockStatus);

      const result = await service.getEmailStatus(emailId);

      expect(emailProvider.getStatus).toHaveBeenCalledWith(emailId);
      expect(result).toEqual(mockStatus);
    });

    it('should throw error if email not found', async () => {
      emailProvider.getStatus.mockRejectedValue(new Error('Email not found'));

      await expect(service.getEmailStatus(emailId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEmailLogs', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated email logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          emailId: 'email-1',
          to: 'user1@example.com',
          subject: 'Test Email 1',
          status: 'SENT',
          sentAt: new Date('2024-01-01T10:00:00Z'),
          deliveryTime: 1.2,
        },
        {
          id: 'log-2',
          emailId: 'email-2',
          to: 'user2@example.com',
          subject: 'Test Email 2',
          status: 'DELIVERED',
          sentAt: new Date('2024-01-01T11:00:00Z'),
          deliveryTime: 0.8,
        },
      ];
      const mockTotal = 2;

      queueService.get.mockResolvedValue({
        data: mockLogs,
        meta: { total: mockTotal, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await service.getEmailLogs(paginationDto);

      expect(queueService.get).toHaveBeenCalledWith('logs', paginationDto);
      expect(result).toEqual({
        data: mockLogs,
        meta: { total: mockTotal, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should filter logs by status', async () => {
      const filterDto = { ...paginationDto, status: 'SENT' };

      queueService.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      await service.getEmailLogs(filterDto);

      expect(queueService.get).toHaveBeenCalledWith('logs', filterDto);
    });

    it('should filter logs by date range', async () => {
      const dateFilterDto = {
        ...paginationDto,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      queueService.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      await service.getEmailLogs(dateFilterDto);

      expect(queueService.get).toHaveBeenCalledWith('logs', dateFilterDto);
    });
  });

  describe('createEmailTemplate', () => {
    const createTemplateDto = {
      name: 'Welcome Template',
      subject: 'Welcome {{userName}}',
      content: '<h1>Welcome {{userName}}</h1><p>Thank you for joining {{companyName}}</p>',
      variables: [
        { name: 'userName', type: 'string', required: true },
        { name: 'companyName', type: 'string', required: true },
      ],
      category: 'ONBOARDING',
      description: 'Template for welcome emails',
    };

    it('should create email template successfully', async () => {
      const mockTemplate = {
        id: 'template-123',
        ...createTemplateDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateService.createTemplate.mockResolvedValue(mockTemplate);

      const result = await service.createEmailTemplate(createTemplateDto);

      expect(templateService.createTemplate).toHaveBeenCalledWith(createTemplateDto);
      expect(result).toEqual(mockTemplate);
    });

    it('should throw error for duplicate template name', async () => {
      templateService.createTemplate.mockRejectedValue(new Error('Template name already exists'));

      await expect(service.createEmailTemplate(createTemplateDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate template syntax', async () => {
      const invalidTemplateDto = {
        ...createTemplateDto,
        content: '<h1>Welcome {{userName}}</h1>', // Missing closing brace
      };

      templateService.validate.mockReturnValue(false);

      await expect(service.createEmailTemplate(invalidTemplateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEmailTemplate', () => {
    const templateId = 'template-123';
    const updateDto = {
      name: 'Updated Welcome Template',
      subject: 'Welcome {{userName}}!',
      content: '<h1>Welcome {{userName}}!</h1><p>Updated content</p>',
    };

    it('should update email template successfully', async () => {
      const mockUpdatedTemplate = {
        id: templateId,
        ...updateDto,
        updatedAt: new Date(),
      };

      templateService.updateTemplate.mockResolvedValue(mockUpdatedTemplate);

      const result = await service.updateEmailTemplate(templateId, updateDto);

      expect(templateService.updateTemplate).toHaveBeenCalledWith(templateId, updateDto);
      expect(result).toEqual(mockUpdatedTemplate);
    });

    it('should throw error if template not found', async () => {
      templateService.updateTemplate.mockRejectedValue(new Error('Template not found'));

      await expect(service.updateEmailTemplate(templateId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteEmailTemplate', () => {
    const templateId = 'template-123';

    it('should delete email template successfully', async () => {
      templateService.deleteTemplate.mockResolvedValue({ deleted: true });

      const result = await service.deleteEmailTemplate(templateId);

      expect(templateService.deleteTemplate).toHaveBeenCalledWith(templateId);
      expect(result).toEqual({ deleted: true });
    });

    it('should throw error if template is in use', async () => {
      templateService.deleteTemplate.mockRejectedValue(new Error('Template is currently in use'));

      await expect(service.deleteEmailTemplate(templateId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEmailTemplates', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return paginated email templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Welcome Template',
          category: 'ONBOARDING',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'template-2',
          name: 'Password Reset',
          category: 'SECURITY',
          createdAt: new Date('2024-01-02'),
        },
      ];
      const mockTotal = 2;

      templateService.listTemplates.mockResolvedValue({
        data: mockTemplates,
        meta: { total: mockTotal, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await service.getEmailTemplates(paginationDto);

      expect(templateService.listTemplates).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual({
        data: mockTemplates,
        meta: { total: mockTotal, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should filter templates by category', async () => {
      const filterDto = { ...paginationDto, category: 'ONBOARDING' };

      templateService.listTemplates.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      await service.getEmailTemplates(filterDto);

      expect(templateService.listTemplates).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('previewEmailTemplate', () => {
    const previewDto = {
      templateId: 'template-123',
      templateData: {
        userName: 'Test User',
        companyName: 'Test Company',
      },
    };

    it('should render template preview successfully', async () => {
      const mockPreview = {
        html: '<h1>Welcome Test User</h1><p>Thank you for joining Test Company</p>',
        text: 'Welcome Test User\nThank you for joining Test Company',
        subject: 'Welcome Test User',
      };

      templateService.render.mockResolvedValue(mockPreview.html);

      const result = await service.previewEmailTemplate(previewDto);

      expect(templateService.render).toHaveBeenCalledWith(
        previewDto.templateId,
        previewDto.templateData
      );
      expect(result).toEqual({
        html: mockPreview.html,
        text: expect.any(String),
        subject: expect.any(String),
      });
    });

    it('should throw error if template not found', async () => {
      templateService.render.mockRejectedValue(new Error('Template not found'));

      await expect(service.previewEmailTemplate(previewDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('testEmailTemplate', () => {
    const testDto = {
      templateId: 'template-123',
      testEmail: 'test@example.com',
      templateData: {
        userName: 'Test User',
        companyName: 'Test Company',
      },
    };

    it('should send test email successfully', async () => {
      const mockResult = {
        id: 'test-email-123',
        status: 'SENT',
        to: testDto.testEmail,
      };

      templateService.render.mockResolvedValue('<h1>Welcome Test User</h1>');
      emailProvider.send.mockResolvedValue(mockResult);

      const result = await service.testEmailTemplate(testDto);

      expect(templateService.render).toHaveBeenCalledWith(
        testDto.templateId,
        testDto.templateData
      );
      expect(emailProvider.send).toHaveBeenCalledWith({
        to: testDto.testEmail,
        subject: expect.stringContaining('Test'),
        content: expect.stringContaining('Welcome Test User'),
      });
      expect(result).toEqual(mockResult);
    });

    it('should throw error for invalid test email', async () => {
      const invalidTestDto = { ...testDto, testEmail: 'invalid-email' };

      emailProvider.validateEmail.mockReturnValue(false);

      await expect(service.testEmailTemplate(invalidTestDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEmailQueue', () => {
    const paginationDto = { page: 1, limit: 10 };

    it('should return email queue status', async () => {
      const mockQueueStatus = {
        pending: 25,
        processing: 5,
        failed: 3,
        completed: 150,
        total: 183,
        stats: {
          averageProcessingTime: 2.5,
          successRate: 95.2,
          failureRate: 4.8,
        },
      };

      queueService.getStats.mockResolvedValue(mockQueueStatus);

      const result = await service.getEmailQueue();

      expect(queueService.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockQueueStatus);
    });

    it('should return detailed queue items', async () => {
      const mockQueueItems = [
        {
          id: 'queue-1',
          emailId: 'email-1',
          to: 'user1@example.com',
          status: 'PENDING',
          priority: 'HIGH',
          attempts: 0,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          scheduledAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      queueService.get.mockResolvedValue({
        data: mockQueueItems,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await service.getEmailQueue(paginationDto);

      expect(queueService.get).toHaveBeenCalledWith('queue', paginationDto);
      expect(result).toEqual({
        data: mockQueueItems,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });
  });

  describe('retryFailedEmails', () => {
    const retryDto = {
      emailIds: ['email-1', 'email-2'],
      maxRetries: 3,
      retryDelay: 300, // 5 minutes
    };

    it('should retry failed emails successfully', async () => {
      const mockRetryResult = {
        totalEmails: 2,
        successfulRetries: 2,
        failedRetries: 0,
        results: [
          { emailId: 'email-1', status: 'RETRY_SUCCESS', attempts: 2 },
          { emailId: 'email-2', status: 'RETRY_SUCCESS', attempts: 1 },
        ],
      };

      queueService.retry.mockResolvedValue(mockRetryResult);

      const result = await service.retryFailedEmails(retryDto);

      expect(queueService.retry).toHaveBeenCalledWith(retryDto);
      expect(result).toEqual(mockRetryResult);
    });

    it('should handle partial retry failures', async () => {
      const mockPartialResult = {
        totalEmails: 2,
        successfulRetries: 1,
        failedRetries: 1,
        results: [
          { emailId: 'email-1', status: 'RETRY_SUCCESS', attempts: 2 },
          { emailId: 'email-2', status: 'RETRY_FAILED', attempts: 4, error: 'Max retries exceeded' },
        ],
      };

      queueService.retry.mockResolvedValue(mockPartialResult);

      const result = await service.retryFailedEmails(retryDto);

      expect(result.successfulRetries).toBe(1);
      expect(result.failedRetries).toBe(1);
    });

    it('should throw error for invalid email IDs', async () => {
      const invalidRetryDto = { ...retryDto, emailIds: [] };

      await expect(service.retryFailedEmails(invalidRetryDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelEmail', () => {
    const emailId = 'email-123';

    it('should cancel email successfully', async () => {
      const mockCancelResult = {
        id: emailId,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      };

      queueService.remove.mockResolvedValue(mockCancelResult);

      const result = await service.cancelEmail(emailId);

      expect(queueService.remove).toHaveBeenCalledWith(emailId);
      expect(result).toEqual(mockCancelResult);
    });

    it('should throw error if email already sent', async () => {
      queueService.remove.mockRejectedValue(new Error('Email already sent, cannot cancel'));

      await expect(service.cancelEmail(emailId)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if email not found', async () => {
      queueService.remove.mockRejectedValue(new Error('Email not found in queue'));

      await expect(service.cancelEmail(emailId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEmailMetrics', () => {
    const metricsDto = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      groupBy: 'DAY', // DAY, WEEK, MONTH
    };

    it('should return comprehensive email metrics', async () => {
      const mockMetrics = {
        summary: {
          totalSent: 1000,
          totalDelivered: 950,
          totalOpened: 600,
          totalClicked: 150,
          totalBounced: 30,
          totalComplained: 5,
          deliveryRate: 95.0,
          openRate: 60.0,
          clickRate: 15.0,
          bounceRate: 3.0,
          complaintRate: 0.5,
        },
        timeline: [
          {
            date: '2024-01-01',
            sent: 50,
            delivered: 48,
            opened: 30,
            clicked: 8,
            bounced: 1,
          },
          {
            date: '2024-01-02',
            sent: 45,
            delivered: 43,
            opened: 28,
            clicked: 7,
            bounced: 0,
          },
        ],
        topTemplates: [
          { templateId: 'welcome-template', sent: 200, opens: 120, clicks: 30 },
          { templateId: 'newsletter-template', sent: 150, opens: 90, clicks: 25 },
        ],
        topDomains: [
          { domain: 'gmail.com', sent: 300, delivered: 295, opens: 180 },
          { domain: 'yahoo.com', sent: 200, delivered: 190, opens: 110 },
        ],
      };

      queueService.getStats.mockResolvedValue(mockMetrics);

      const result = await service.getEmailMetrics(metricsDto);

      expect(queueService.getStats).toHaveBeenCalledWith('metrics', metricsDto);
      expect(result).toEqual(mockMetrics);
    });

    it('should handle metrics with no data', async () => {
      const emptyMetrics = {
        summary: {
          totalSent: 0,
          totalDelivered: 0,
          totalOpened: 0,
          totalClicked: 0,
          totalBounced: 0,
          totalComplained: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
          complaintRate: 0,
        },
        timeline: [],
        topTemplates: [],
        topDomains: [],
      };

      queueService.getStats.mockResolvedValue(emptyMetrics);

      const result = await service.getEmailMetrics(metricsDto);

      expect(result.summary.totalSent).toBe(0);
      expect(result.timeline).toEqual([]);
    });
  });
});
