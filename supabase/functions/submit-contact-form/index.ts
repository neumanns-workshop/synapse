import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPPORT_EMAIL = 'social@neumannsworkshop.com' // Your actual support email

interface ContactSubmission {
  type: string
  subject: string
  description: string
  userEmail?: string
  userId?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('Resend API key not configured')
    }

    const submission: ContactSubmission = await req.json()
    
    if (!submission.subject || !submission.description) {
      throw new Error('Subject and description are required')
    }

    // Create email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">New Contact Form Submission</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Type:</strong> ${submission.type}</p>
          <p><strong>Subject:</strong> ${submission.subject}</p>
          ${submission.userEmail ? `<p><strong>User Email:</strong> ${submission.userEmail}</p>` : ''}
          ${submission.userId ? `<p><strong>User ID:</strong> ${submission.userId}</p>` : ''}
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        
        <div style="background: #fff; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0;">
          <h3>Message:</h3>
          <p style="white-space: pre-wrap;">${submission.description}</p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This email was sent from the Synapse contact form at ${new Date().toISOString()}
        </p>
      </div>
    `

    const emailText = `
New Contact Form Submission

Type: ${submission.type}
Subject: ${submission.subject}
${submission.userEmail ? `User Email: ${submission.userEmail}` : ''}
${submission.userId ? `User ID: ${submission.userId}` : ''}
Timestamp: ${new Date().toISOString()}

Message:
${submission.description}

---
This email was sent from the Synapse contact form.
    `.trim()

    // Send email to support
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'support@synapsegame.ai',
        to: [SUPPORT_EMAIL],
        subject: `[Synapse Contact] ${submission.type}: ${submission.subject}`,
        html: emailHtml,
        text: emailText,
        // If user provided email, set reply-to
        ...(submission.userEmail && { reply_to: [submission.userEmail] }),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Resend API error: ${error.message}`)
    }

    const result = await response.json()
    console.log('📧 Contact form email sent successfully:', result.id)

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('📧 Failed to send contact form email:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 