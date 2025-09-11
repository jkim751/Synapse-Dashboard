import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = (await headerPayload).get('svix-id')
  const svix_timestamp = (await headerPayload).get('svix-timestamp')
  const svix_signature = (await headerPayload).get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()
  const body = JSON.parse(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
      status: 400,
    })
  }

  const { id } = evt.data
  const eventType = evt.type

  if (eventType === 'user.updated') {
    try {
      const userData = evt.data
      const role = userData.public_metadata?.role as string
      
      if (!role) {
        console.log('No role found for user:', id)
        return new Response('No role found', { status: 200 })
      }

      // Only include fields that have actual values
      const updateData: any = {}
      
      if (userData.first_name) updateData.name = userData.first_name
      if (userData.last_name) updateData.surname = userData.last_name
      if (userData.email_addresses?.[0]?.email_address) updateData.email = userData.email_addresses[0].email_address
      if (userData.phone_numbers?.[0]?.phone_number) updateData.phone = userData.phone_numbers[0].phone_number
      if (userData.image_url) updateData.img = userData.image_url

      // Only update if there's something to update
      if (Object.keys(updateData).length === 0) {
        console.log('No fields to update for user:', id)
        return new Response('No fields to update', { status: 200 })
      }

      // Update based on role
      switch (role) {
        case 'admin':
          await prisma.admin.update({
            where: { id: id },
            data: updateData,
          })
          break
        case 'teacher':
          await prisma.teacher.update({
            where: { id: id },
            data: updateData,
          })
          break
        case 'student':
          await prisma.student.update({
            where: { id: id },
            data: updateData,
          })
          break
        case 'parent':
          await prisma.parent.update({
            where: { id: id },
            data: updateData,
          })
          break
        default:
          console.log('Unknown role:', role)
          return new Response('Unknown role', { status: 200 })
      }

      console.log(`Updated ${role} profile for user:`, id)
      return new Response('Profile updated successfully', { status: 200 })
    } catch (error) {
      console.error('Error updating user profile:', error)
      return new Response('Error updating profile', { status: 500 })
    }
  }

  return new Response('Webhook processed', { status: 200 })
}
