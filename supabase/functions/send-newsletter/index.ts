import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const UNSUBSCRIBE_SECRET = Deno.env.get('UNSUBSCRIBE_SECRET') || 'fallback-secret-key'
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
)

async function generateUnsubscribeToken(userId: string): Promise<string> {
  const data = userId + UNSUBSCRIBE_SECRET
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface NewsletterPayload {
  articleId: string
  title: string
  content: string
  date: string
  priority: 'low' | 'medium' | 'high'
  dryRun?: boolean // For testing without actually sending
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

    const { articleId, title, content, date, priority, dryRun = false }: NewsletterPayload = await req.json()
    
    if (!articleId || !title || !content) {
      throw new Error('Article ID, title, and content are required')
    }

    // Get all users who opted in for email updates
    const { data: optedInUsers, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('privacy_settings->email_updates', true)
      .not('email', 'is', null)

    if (usersError) {
      throw new Error(`Failed to fetch opted-in users: ${usersError.message}`)
    }

    if (!optedInUsers || optedInUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users opted in for email updates',
          recipientCount: 0 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const recipients = optedInUsers.map(user => user.email).filter(Boolean)

    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Dry run completed',
          recipientCount: recipients.length,
          recipients: recipients.slice(0, 5) // Show first 5 for preview
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

        // Send individual emails with personalized unsubscribe tokens
    const appUrl = 'https://synapsegame.ai'
          const emailPromises = optedInUsers.map(async (user) => {
        const unsubscribeToken = await generateUnsubscribeToken(user.id)
      const unsubscribeUrl = `${appUrl}/functions/v1/unsubscribe?token=${unsubscribeToken}`

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Synapse Update: ${title}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6366f1;">Synapse Update</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #333; margin-top: 0;">${title}</h2>
              <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
                ${new Date(date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <div style="white-space: pre-wrap; line-height: 1.6;">${content}</div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Play Synapse
              </a>
            </div>
            
            <p style="margin-top: 30px;">
              Happy pathfinding!<br>
              <strong>Jared at Galaxy Brain Entertainment</strong>
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666; text-align: center;">
              You received this email because you opted in to receive Synapse game updates.<br>
              <a href="${unsubscribeUrl}" style="color: #6366f1;">Unsubscribe</a> | 
              <a href="${appUrl}" style="color: #6366f1;">Visit Synapse</a>
            </p>
          </body>
        </html>
      `

      const emailText = `
Synapse Update: ${title}

${new Date(date).toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

${content}

Play Synapse: ${appUrl}

Happy pathfinding!
Jared at Galaxy Brain Entertainment

---
You received this email because you opted in to receive Synapse game updates.
Unsubscribe: ${unsubscribeUrl}
      `.trim()

      // Send individual email
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'news@synapsegame.ai',
          to: [user.email],
          subject: `Synapse Update: ${title}`,
          html: emailHtml,
          text: emailText,
        }),
      })
    })

    // Wait for all emails to be sent
    const emailResponses = await Promise.allSettled(emailPromises)
    
    // Count successes and failures
    let successCount = 0
    let failureCount = 0
    
    emailResponses.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.ok) {
        successCount++
      } else {
        failureCount++
        console.error(`Failed to send to ${optedInUsers[index].email}:`, result)
      }
    })

    console.log(`📧 Newsletter "${title}" sent: ${successCount} success, ${failureCount} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipientCount: optedInUsers.length,
        successCount,
        failureCount,
        message: `Newsletter sent: ${successCount} delivered, ${failureCount} failed`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('📧 Failed to send newsletter:', error)
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