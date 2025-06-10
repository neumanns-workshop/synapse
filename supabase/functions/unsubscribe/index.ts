import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/cors.ts'

const UNSUBSCRIBE_SECRET = Deno.env.get('UNSUBSCRIBE_SECRET') || 'fallback-secret-key'
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
)

async function generateToken(userId: string): Promise<string> {
  const data = userId + UNSUBSCRIBE_SECRET
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function validateTokenAndGetUserId(token: string): Promise<string | null> {
  // We need to check all users to find the matching token
  // In a production system, you might want a more efficient approach
  const { data: users, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('privacy_settings->email_updates', true)

  if (error || !users) {
    console.error('Error fetching users:', error)
    return null
  }

  for (const user of users) {
    const expectedToken = await generateToken(user.id)
    if (expectedToken === token) {
      return user.id
    }
  }

  return null
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Unsubscribe - Synapse</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
            <h1 style="color: #e74c3c;">Invalid Unsubscribe Link</h1>
            <p>This unsubscribe link is not valid. Please contact support if you need help.</p>
            <p><a href="https://synapsegame.ai" style="color: #6366f1;">Return to Synapse</a></p>
          </body>
        </html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 400,
        }
      )
    }

    // Validate token and get user ID
    const userId = await validateTokenAndGetUserId(token)

    if (!userId) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Invalid Token - Synapse</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
            <h1 style="color: #e74c3c;">Invalid Unsubscribe Token</h1>
            <p>This unsubscribe link has expired or is not valid.</p>
            <p>You can manage your email preferences by logging into your account:</p>
            <p><a href="https://synapsegame.ai/profile" style="color: #6366f1;">Manage Email Preferences</a></p>
            <p><a href="https://synapsegame.ai" style="color: #6366f1;">Return to Synapse</a></p>
          </body>
        </html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 400,
        }
      )
    }

    // Update user's email preferences
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        privacy_settings: {
          email_updates: false,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user preferences:', updateError)
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Error - Synapse</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
            <h1 style="color: #e74c3c;">Unsubscribe Error</h1>
            <p>There was an error processing your unsubscribe request. Please try again or contact support.</p>
            <p><a href="https://synapsegame.ai" style="color: #6366f1;">Return to Synapse</a></p>
          </body>
        </html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 500,
        }
      )
    }

    // Success - show confirmation page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed - Synapse</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background-color: #f8f9fa;">
          <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #28a745; margin-bottom: 20px;">✅ Successfully Unsubscribed</h1>
            <p style="font-size: 18px; margin-bottom: 20px;">You have been unsubscribed from Synapse email updates.</p>
            <p style="color: #666; margin-bottom: 30px;">You will no longer receive newsletters, game updates, or promotional emails from us.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #555;">
                <strong>Note:</strong> You will still receive important account-related emails (password resets, security notifications, etc.) as these are required for account functionality.
              </p>
            </div>

            <p style="margin-top: 30px;">
              If you change your mind, you can re-enable email updates anytime by logging into your account and updating your preferences.
            </p>

            <div style="margin-top: 40px;">
              <a href="https://synapsegame.ai" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                Play Synapse
              </a>
              <a href="https://synapsegame.ai/profile" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Manage Preferences
              </a>
            </div>

            <p style="font-size: 12px; color: #666; margin-top: 30px;">
              Sorry to see you go! If you have feedback about our emails, we'd love to hear from you.
            </p>
          </div>
        </body>
      </html>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Error - Synapse</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
          <h1 style="color: #e74c3c;">Unsubscribe Error</h1>
          <p>There was an unexpected error. Please contact support if this continues.</p>
          <p><a href="https://synapsegame.ai" style="color: #6366f1;">Return to Synapse</a></p>
        </body>
      </html>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 500,
      }
    )
  }
}) 