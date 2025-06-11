// Email service using Resend for custom email sending
// This is separate from Supabase Auth emails which are configured in the dashboard

export interface EmailTemplate {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface WelcomeEmailData {
  name: string;
  appUrl: string;
}

export interface PremiumWelcomeEmailData {
  name: string;
  featuresUrl: string;
}

export class EmailService {
  private static instance: EmailService;
  private apiKey: string;
  private fromEmails: {
    noreply: string;
    news: string;
    support: string;
  };
  private isConfigured = false;

  private constructor() {
    // Custom emails are now handled via Supabase Edge Function
    this.apiKey = "edge-function"; // Placeholder - not used
    this.fromEmails = {
      noreply: "noreply@synapsegame.ai",
      news: "news@synapsegame.ai",
      support: "support@synapsegame.ai",
    };
    this.isConfigured = true; // Always configured now via edge function

    console.log(
      "📧 EmailService: Using Supabase Edge Function for custom emails",
    );
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send a welcome email to new users
   */
  public async sendWelcomeEmail(email: string, data: WelcomeEmailData) {
    if (!this.isConfigured) {
      console.log("📧 Would send welcome email to:", email);
      return { success: true }; // Return success for development
    }

    const template: EmailTemplate = {
      to: [email],
      subject: "Welcome to Synapse! 🧠",
      html: this.generateWelcomeHtml(data),
      text: this.generateWelcomeText(data),
    };

    return this.sendEmail(template, "news");
  }

  /**
   * Send a premium welcome email to new premium users
   */
  public async sendPremiumWelcomeEmail(
    email: string,
    data: PremiumWelcomeEmailData,
  ) {
    if (!this.isConfigured) {
      console.log("📧 Would send premium welcome email to:", email);
      return { success: true };
    }

    const template: EmailTemplate = {
      to: [email],
      subject: "Welcome to Synapse Premium! ⭐",
      html: this.generatePremiumWelcomeHtml(data),
      text: this.generatePremiumWelcomeText(data),
    };

    return this.sendEmail(template, "news");
  }

  /**
   * Send a support-related email from support@synapsegame.ai
   */
  public async sendSupportEmail(
    email: string,
    subject: string,
    html: string,
    text?: string,
  ) {
    if (!this.isConfigured) {
      console.log("📧 Would send support email to:", email);
      return { success: true };
    }

    const template: EmailTemplate = {
      to: [email],
      subject,
      html,
      text,
    };

    return this.sendEmail(template, "support");
  }

  /**
   * Send email using Supabase Edge Function
   */
  private async sendEmail(
    template: EmailTemplate,
    fromType: "noreply" | "news" | "support" = "noreply",
  ) {
    try {
      // Import SupabaseService to get the client
      const { SupabaseService } = await import("./SupabaseService");
      const supabaseService = SupabaseService.getInstance();
      const supabase = (supabaseService as any).supabase;

      const response = await supabase.functions.invoke("send-custom-email", {
        body: {
          template: {
            ...template,
            from_type: fromType,
          },
        },
      });

      if (response.error) {
        throw new Error(`Edge function error: ${response.error.message}`);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || "Unknown error from edge function");
      }

      console.log("📧 Email sent successfully via edge function:", result.id);
      return { success: true, id: result.id };
    } catch (error) {
      console.error("📧 Failed to send email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Email templates
  private generateWelcomeHtml(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Synapse</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1;">🧠 Welcome to Synapse!</h1>
          </div>
          
          <p>Hi ${data.name},</p>
          
          <p>Welcome to Synapse, the ultimate word association game that challenges your mind and expands your thinking!</p>
          
          <p>You're now ready to:</p>
          <ul>
            <li>🎯 Play challenging word association puzzles</li>
            <li>🏆 Track your progress and scores</li>
            <li>🧠 Exercise your cognitive abilities</li>
            <li>📊 Compare your performance on leaderboards</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.appUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Playing</a>
          </div>
          
          <p>Get ready to challenge your mind and discover new connections between words!</p>
          
          <p>Best regards,<br>The Synapse Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            You received this email because you signed up for Synapse. 
            You can manage your email preferences in your account settings.
          </p>
        </body>
      </html>
    `;
  }

  private generateWelcomeText(data: WelcomeEmailData): string {
    return `
Welcome to Synapse! 🧠

Hi ${data.name},

Welcome to Synapse, the ultimate word association game that challenges your mind and expands your thinking!

You're now ready to:
- Play challenging word association puzzles
- Track your progress and scores  
- Exercise your cognitive abilities
- Compare your performance on leaderboards

Start playing: ${data.appUrl}

Get ready to challenge your mind and discover new connections between words!

Best regards,
The Synapse Team

You received this email because you signed up for Synapse. You can manage your email preferences in your account settings.
    `.trim();
  }

  private generatePremiumWelcomeHtml(data: PremiumWelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Synapse Premium</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b;">⭐ Welcome to Synapse Premium!</h1>
          </div>
          
          <p>Hi ${data.name},</p>
          
          <p>Congratulations! You've unlocked the full power of Synapse Premium. Get ready for an enhanced experience!</p>
          
          <p>Your premium features include:</p>
          <ul>
            <li>🎯 Unlimited game sessions</li>
            <li>📊 Advanced analytics and insights</li>
            <li>🏆 Exclusive premium challenges</li>
            <li>🚀 Priority customer support</li>
            <li>🎨 Custom themes and personalization</li>
            <li>💾 Cloud sync across all devices</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.featuresUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Explore Premium Features</a>
          </div>
          
          <p>Thank you for supporting Synapse! Your premium subscription helps us continue developing amazing features.</p>
          
          <p>Best regards,<br>The Synapse Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            You received this email because you purchased Synapse Premium. 
            You can manage your subscription and email preferences in your account settings.
          </p>
        </body>
      </html>
    `;
  }

  private generatePremiumWelcomeText(data: PremiumWelcomeEmailData): string {
    return `
Welcome to Synapse Premium! ⭐

Hi ${data.name},

Congratulations! You've unlocked the full power of Synapse Premium. Get ready for an enhanced experience!

Your premium features include:
- Unlimited game sessions
- Advanced analytics and insights
- Exclusive premium challenges
- Priority customer support
- Custom themes and personalization
- Cloud sync across all devices

Explore premium features: ${data.featuresUrl}

Thank you for supporting Synapse! Your premium subscription helps us continue developing amazing features.

Best regards,
The Synapse Team

You received this email because you purchased Synapse Premium. You can manage your subscription and email preferences in your account settings.
    `.trim();
  }
}

export default EmailService;
